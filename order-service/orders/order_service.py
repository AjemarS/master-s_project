"""
Domain service for order business logic.
Encapsulates order creation, status transitions, and inventory interactions.
"""
import random
import time
import logging
from decimal import Decimal

from django.db import IntegrityError, transaction

from orders.models import Order, OrderItem
from orders.eventbus import publish_event
from orders.inventory_client import reserve_stock, deduct_stock, release_stock
from orders.event_builder import build_order_event

logger = logging.getLogger(__name__)


def generate_order_number(attempt=0):
    """Generate a unique order number with collision-safe suffix."""
    ts = int(time.time() * 1000) % 100000
    rnd = random.randint(100, 999)
    if attempt == 0:
        return f"ORD-{ts}{rnd}"
    return f"ORD-{ts}{rnd}-{attempt}"


def calculate_total(items_data):
    """Calculate order total from validated items data."""
    return sum(Decimal(str(i["price"])) * i["quantity"] for i in items_data)


def create_order(serializer_data, items_data, channel, user_id):
    """
    Atomically create an order with its items. Retries on order number collision.
    Returns the created Order instance.
    """
    for attempt in range(3):
        try:
            order_number = generate_order_number(attempt)
            with transaction.atomic():
                total = calculate_total(items_data)
                order = Order.objects.create(
                    order_number=order_number,
                    channel=channel,
                    status=Order.UNPAID,
                    warehouse_id=serializer_data.get("warehouse_id"),
                    delivery_method=serializer_data.get("delivery_method", Order.PICKUP),
                    shipping_city=serializer_data.get("shipping_city", ""),
                    shipping_address=serializer_data.get("shipping_address", ""),
                    shipping_cost=serializer_data.get("shipping_cost", Decimal("0.00")),
                    customer_name=serializer_data.get("customer_name", ""),
                    customer_phone=serializer_data.get("customer_phone", ""),
                    customer_email=serializer_data.get("customer_email", ""),
                    total_amount=total,
                    notes=serializer_data.get("notes", ""),
                    created_by=user_id,
                )
                order_items = [
                    OrderItem(
                        order=order,
                        product_id=item["product_id"],
                        product_name=item.get("product_name", ""),
                        quantity=item["quantity"],
                        price=item["price"],
                        cost_price=item.get("cost_price", Decimal("0.00")),
                    )
                    for item in items_data
                ]
                OrderItem.objects.bulk_create(order_items)

                transaction.on_commit(
                    lambda o=order: publish_event("order.created", build_order_event(o))
                )

            logger.info(
                "Order created | number=%s channel=%s items=%d",
                order.order_number, channel, len(order_items),
            )
            return order

        except IntegrityError:
            if attempt == 2:
                logger.error("Order number collision exhausted | channel=%s", channel)
                raise
            continue


def update_order_status(order, new_status, request=None):
    """
    Update order status with inventory side effects.
    Returns (order, error_response) where error_response is None on success.
    """
    if not order.can_transition_to(new_status):
        return order, {
            "error": f"Cannot transition from {order.status} to {new_status}",
            "allowed": Order.STATUS_TRANSITIONS.get(order.status, []),
        }

    old_status = order.status

    with transaction.atomic():
        order.status = new_status
        order.save()
        transaction.on_commit(lambda: publish_event("order.status_changed", build_order_event(order)))
        if new_status == Order.CANCELLED:
            transaction.on_commit(lambda: publish_event("order.cancelled", build_order_event(order)))

    # Release stock on cancellation
    if new_status == Order.CANCELLED and order.warehouse_id:
        release_order_stock(order, request)

    # Deduct stock on shipping — revert status on failure
    if new_status == Order.DELIVERING and order.warehouse_id:
        all_success, succeeded = deduct_order_stock(order, request)
        if not all_success:
            # Compensate already-deducted items
            for pid, qty in succeeded:
                release_stock(
                    product_id=pid,
                    warehouse_id=order.warehouse_id,
                    quantity=qty,
                    reference_type="order",
                    reference_id=str(order.id),
                    idempotency_key=f"compensate-deduct-{order.id}-{pid}",
                    request=request,
                )
            order.status = old_status
            order.save(update_fields=["status"])
            logger.error(
                "Status reverted due to deduct failure | order=%s %s->%s",
                order.order_number, old_status, new_status,
            )
            return order, {"error": "Stock deduct failed, status reverted", "detail": "Inventory service error"}

    logger.info("Order status changed | number=%s %s->%s", order.order_number, old_status, new_status)
    return order, None


def release_order_stock(order, request=None):
    """Release reserved stock for a cancelled order."""
    for item in order.items.all():
        result, error = release_stock(
            product_id=item.product_id,
            warehouse_id=order.warehouse_id,
            quantity=item.quantity,
            reference_type="order",
            reference_id=str(order.id),
            idempotency_key=f"release-{order.id}-{item.product_id}",
            request=request,
        )
        if error:
            logger.error(
                "Stock release failed | order=%s product=%s error=%s",
                order.order_number, item.product_id, error,
            )


def deduct_order_stock(order, request=None):
    """
    Deduct stock for shipping. Returns (all_success, succeeded_items).
    succeeded_items can be used for compensation on partial failure.
    """
    all_success = True
    succeeded = []
    for item in order.items.all():
        result, error = deduct_stock(
            product_id=item.product_id,
            warehouse_id=order.warehouse_id,
            quantity=item.quantity,
            reference_type="order",
            reference_id=str(order.id),
            idempotency_key=f"deduct-{order.id}-{item.product_id}",
            request=request,
        )
        if error:
            logger.error(
                "Stock deduct failed | order=%s product=%s error=%s",
                order.order_number, item.product_id, error,
            )
            all_success = False
        else:
            succeeded.append((item.product_id, item.quantity))
    return all_success, succeeded


def reserve_order_stock(order, request=None):
    """
    Reserve stock for all items in an order.
    Returns (all_success, succeeded_items) where succeeded_items can be used for compensation.
    """
    all_success = True
    succeeded = []
    for item in order.items.all():
        result, error = reserve_stock(
            product_id=item.product_id,
            warehouse_id=order.warehouse_id,
            quantity=item.quantity,
            reference_type="order",
            reference_id=str(order.id),
            idempotency_key=f"reserve-{order.id}-{item.product_id}",
            request=request,
        )
        if error:
            logger.error(
                "Stock reserve failed | order=%s product=%s error=%s",
                order.order_number, item.product_id, error,
            )
            all_success = False
        else:
            succeeded.append((item.product_id, item.quantity))
    return all_success, succeeded
