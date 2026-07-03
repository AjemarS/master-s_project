import logging
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.db.models import F

from shared_eventbus.connection import ensure_exchange, get_connection
from shared_eventbus.consumer import start_consumer as shared_start_consumer
from shared_eventbus.publisher import publish_event

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "techhub.events"
LOW_STOCK_THRESHOLD = getattr(settings, "LOW_STOCK_THRESHOLD", 5)


def declare_queues(channel):
    ensure_exchange(channel)
    channel.queue_declare(queue="inventory.order.reserve", durable=True)
    channel.queue_bind(queue="inventory.order.reserve", exchange=EXCHANGE_NAME, routing_key="order.created")
    channel.queue_declare(queue="inventory.order.release", durable=True)
    channel.queue_bind(queue="inventory.order.release", exchange=EXCHANGE_NAME, routing_key="order.cancelled")
    channel.queue_declare(queue="product.stock.sync", durable=True)
    channel.queue_bind(queue="product.stock.sync", exchange=EXCHANGE_NAME, routing_key="inventory.stock.changed")
    channel.queue_declare(queue="product.catalog.update", durable=True)
    channel.queue_bind(queue="product.catalog.update", exchange=EXCHANGE_NAME, routing_key="inventory.goods_received")
    channel.queue_declare(queue="notification.low_stock", durable=True)
    channel.queue_bind(queue="notification.low_stock", exchange=EXCHANGE_NAME, routing_key="inventory.low_stock")


def _check_and_publish_low_stock(product_id, warehouse_id, quantity, warehouse_name=""):
    if quantity <= LOW_STOCK_THRESHOLD:
        publish_event("inventory.low_stock", {
            "event_id": str(uuid4()),
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "warehouse_name": warehouse_name,
            "quantity": quantity,
        })
        logger.info("Low stock alert | product=%s warehouse=%s qty=%d", product_id, warehouse_id, quantity)


def _handle_order_created(event):
    from .models import Stock, StockMovement
    order_id = event.get("order_id")
    warehouse_id = event.get("warehouse_id")
    items = event.get("items", [])
    if not warehouse_id or not items:
        logger.warning("order.created missing warehouse_id or items")
        return
    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        try:
            stock = Stock.objects.select_for_update().get(product_id=product_id, warehouse_id=warehouse_id)
            available = stock.quantity - stock.reserved
            if available >= quantity:
                Stock.objects.filter(product_id=product_id, warehouse_id=warehouse_id).update(reserved=F("reserved") + quantity)
                StockMovement.objects.create(product_id=product_id, from_warehouse_id=warehouse_id, quantity=quantity, type=StockMovement.RESERVE, reference_type="order", reference_id=str(order_id))
                logger.info("Async reserve | product=%s warehouse=%s qty=%d", product_id, warehouse_id, quantity)
            else:
                logger.warning("Async reserve insufficient | product=%s available=%d needed=%d", product_id, available, quantity)
        except Stock.DoesNotExist:
            logger.warning("Async reserve no stock | product=%s warehouse=%s", product_id, warehouse_id)


def _handle_order_cancelled(event):
    from .models import Stock, StockMovement
    order_id = event.get("order_id")
    warehouse_id = event.get("warehouse_id")
    items = event.get("items", [])
    if not warehouse_id or not items:
        return
    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        try:
            stock = Stock.objects.select_for_update().get(product_id=product_id, warehouse_id=warehouse_id)
            release_qty = min(quantity, stock.reserved)
            if release_qty > 0:
                Stock.objects.filter(product_id=product_id, warehouse_id=warehouse_id).update(reserved=F("reserved") - release_qty)
                StockMovement.objects.create(product_id=product_id, from_warehouse_id=warehouse_id, quantity=release_qty, type=StockMovement.RELEASE, reference_type="order", reference_id=str(order_id))
                logger.info("Async release | product=%s warehouse=%s qty=%d", product_id, warehouse_id, release_qty)
        except Stock.DoesNotExist:
            pass


def _handle_event(routing_key, event, event_id):
    from .models import ProcessedEvent
    from shared_eventbus.consumer import dedup_check, dedup_claim

    if dedup_check(event_id, ProcessedEvent):
        logger.info("Duplicate event ignored | event_id=%s", event_id)
        return

    with transaction.atomic():
        dedup_claim(event_id, ProcessedEvent)
        if routing_key == "order.created":
            logger.info("order.created received (async reserve)")
            _handle_order_created(event)
        elif routing_key == "order.cancelled":
            _handle_order_cancelled(event)


QUEUE_MAP = {
    "inventory.order.reserve": lambda event, event_id: _handle_event("order.created", event, event_id),
    "inventory.order.release": lambda event, event_id: _handle_event("order.cancelled", event, event_id),
}


def start_consumer():
    declare_queues(get_connection().channel())
    from django.utils import timezone
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=7)
    purged, _ = ProcessedEvent.objects.filter(processed_at__lt=cutoff).delete()
    if purged:
        logger.info("Purged %d stale ProcessedEvent records", purged)
    shared_start_consumer(QUEUE_MAP, "Inventory")
