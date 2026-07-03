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
        logger.warning("Low stock alert | product=%s warehouse=%s qty=%d", product_id, warehouse_id, quantity)


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
            from .stock_service import async_reserve
            async_reserve(event.get("order_id"), event.get("warehouse_id"), event.get("items", []))
        elif routing_key == "order.cancelled":
            from .stock_service import async_release
            async_release(event.get("order_id"), event.get("warehouse_id"), event.get("items", []))


QUEUE_MAP = {
    "inventory.order.reserve": lambda event, event_id: _handle_event("order.created", event, event_id),
    "inventory.order.release": lambda event, event_id: _handle_event("order.cancelled", event, event_id),
}


def start_consumer():
    declare_queues(get_connection().channel())
    shared_start_consumer(QUEUE_MAP, "Inventory")
