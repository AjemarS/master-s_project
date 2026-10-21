"""
Returns and warranty claims: who may claim what, and what each status change does to stock and money.
"""
import calendar
import logging
from datetime import timedelta

import stripe
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from orders.inventory_client import deduct_stock_batch, return_stock
from orders.models import Order, OrderItem, ReturnRequest

logger = logging.getLogger(__name__)

# Return of goods of proper quality within 14 days of receipt (Ukrainian consumer protection law)
RETURN_DAYS = 14
# Items sold before warranties were snapshotted per sale
DEFAULT_WARRANTY_MONTHS = 12

HANDED_OVER = (Order.DELIVERED, Order.COMPLETED)


def add_months(moment, months):
    month_index = moment.month - 1 + months
    year, month = moment.year + month_index // 12, month_index % 12 + 1
    return moment.replace(year=year, month=month, day=min(moment.day, calendar.monthrange(year, month)[1]))


def handed_over_at(order):
    # shortcut: orders delivered before delivered_at existed fall back to their last update; exact for new orders
    return order.delivered_at or order.updated_at


def claim_deadline(item, kind):
    start = handed_over_at(item.order)
    if kind == ReturnRequest.RETURN:
        return start + timedelta(days=RETURN_DAYS)
    return add_months(start, item.warranty_months or DEFAULT_WARRANTY_MONTHS)


def claimable_quantity(item):
    """Units not already covered by a live or settled claim; a finished repair frees its units again."""
    taken = (
        item.returns.exclude(status=ReturnRequest.REJECTED)
        .exclude(Q(status=ReturnRequest.RESOLVED) & Q(resolution=ReturnRequest.REPAIR))
        .aggregate(n=Sum("quantity"))["n"] or 0
    )
    return item.quantity - taken


def create_return(item, kind, quantity, reason, created_by):
    with transaction.atomic():
        # Lock the line so two simultaneous claims cannot both take the last unit
        item = OrderItem.objects.select_for_update().select_related("order").get(pk=item.pk)
        return _create_return_locked(item, kind, quantity, reason, created_by)


def _create_return_locked(item, kind, quantity, reason, created_by):
    order = item.order
    if order.status not in HANDED_OVER:
        raise ValidationError({"item_id": "The order has not been handed over yet."})
    if timezone.now() > claim_deadline(item, kind):
        period = f"{RETURN_DAYS} days" if kind == ReturnRequest.RETURN else "the warranty period"
        raise ValidationError({"kind": f"The claim period ({period}) has ended."})
    available = claimable_quantity(item)
    if quantity > available:
        raise ValidationError({"quantity": f"Only {available} unit(s) can still be claimed."})
    ret = ReturnRequest.objects.create(
        order=order, item=item, kind=kind, quantity=quantity, reason=reason, created_by=created_by,
    )
    logger.info("Return created | id=%s order=%s kind=%s qty=%d", ret.pk, order.order_number, kind, quantity)
    return ret


def transition(ret, new_status, *, resolution="", restock=None, comment="", request=None):
    """
    Move a claim to new_status with its side effects. Returns (error, http_status); error is None on success.
    Side effects run before the save, so a failed refund or stock call leaves the claim where it was.
    """
    if new_status not in ReturnRequest.STATUS_TRANSITIONS[ret.status]:
        return {
            "error": f"Cannot move a claim from {ret.status} to {new_status}",
            "allowed": ReturnRequest.STATUS_TRANSITIONS[ret.status],
        }, 400

    order, item = ret.order, ret.item
    if new_status == ReturnRequest.REJECTED and not comment.strip():
        return {"error": "A rejection needs a comment for the customer"}, 400
    if new_status == ReturnRequest.REJECTED and ret.restocked:
        return {"error": "The unit is already back in stock: resolve the claim instead"}, 400

    if new_status == ReturnRequest.RECEIVED:
        # Unopened returns go back on sale; a faulty warranty unit does not, unless the admin says so
        if restock is None:
            restock = ret.kind == ReturnRequest.RETURN
        if restock:
            if not order.warehouse_id:
                return {"error": "The order has no warehouse to restock"}, 400
            _, error = return_stock(
                product_id=item.product_id, warehouse_id=order.warehouse_id, quantity=ret.quantity,
                reference_type="return", reference_id=str(ret.pk), idempotency_key=f"return-{ret.pk}",
                request=request,
            )
            if error:
                logger.error("Restock failed | return=%s error=%s", ret.pk, error)
                return {"error": "Restock failed", "detail": error}, 502
            ret.restocked = True

    if new_status == ReturnRequest.RESOLVED:
        valid = {ReturnRequest.REFUND, ReturnRequest.REPLACE}
        if ret.kind == ReturnRequest.WARRANTY:
            valid.add(ReturnRequest.REPAIR)
        if resolution not in valid:
            return {"error": f"Resolution must be one of {sorted(valid)}"}, 400
        error = _apply_resolution(ret, resolution, request)
        if error:
            return error, 502
        ret.resolution = resolution

    ret.status = new_status
    if comment:
        ret.admin_comment = comment
    ret.save()
    logger.info("Return %s -> %s | order=%s", ret.pk, new_status, order.order_number)
    return None, 200


def _apply_resolution(ret, resolution, request):
    order, item = ret.order, ret.item
    if resolution == ReturnRequest.REFUND:
        amount = item.price * ret.quantity
        if order.stripe_payment_intent_id:
            try:
                refund = stripe.Refund.create(
                    payment_intent=order.stripe_payment_intent_id,
                    amount=int(amount * 100),
                    idempotency_key=f"rma-{ret.pk}",
                )
            except stripe.error.StripeError as e:
                logger.error("Stripe refund failed | return=%s error=%s", ret.pk, e)
                return {"error": "Refund failed", "detail": str(e)}
            ret.stripe_refund_id = refund.id
        # Without a Stripe payment (POS, cash) the cashier pays out; the amount is recorded either way
        ret.refund_amount = amount
    elif resolution == ReturnRequest.REPLACE:
        if not order.warehouse_id:
            return {"error": "The order has no warehouse to take a replacement from"}
        _, error = deduct_stock_batch(
            warehouse_id=order.warehouse_id,
            items=[{"product_id": item.product_id, "quantity": ret.quantity}],
            from_reserved=False, reference_type="return", reference_id=str(ret.pk),
            idempotency_key=f"replace-{ret.pk}", request=request,
        )
        if error:
            logger.error("Replacement deduct failed | return=%s error=%s", ret.pk, error)
            return {"error": "No replacement unit could be taken from stock", "detail": error}
    return None
