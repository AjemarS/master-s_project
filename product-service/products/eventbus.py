import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone

from shared_eventbus.connection import ensure_exchange, get_connection
from shared_eventbus.consumer import dedup_check, dedup_claim, start_consumer as shared_start_consumer
from shared_eventbus.publisher import publish_event

from .models import ProcessedEvent, Product

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "techhub.events"


def with_dedup(handler):
    """Wrap handler with ProcessedEvent dedup. Handles concurrent-consumer race."""
    def wrapped(event, event_id):
        if event_id and dedup_check(event_id, ProcessedEvent):
            logger.info("Duplicate event skipped | event_id=%s", event_id)
            return
        if event_id:
            try:
                dedup_claim(event_id, ProcessedEvent)
            except IntegrityError:
                logger.info("Duplicate event skipped (race) | event_id=%s", event_id)
                return
        handler(event, event_id)
    return wrapped


def _adjust_stock(product_id, delta):
    """Atomically adjust stock, sync in_stock, publish alert if zeroed."""
    with transaction.atomic():
        Product.objects.filter(pk=product_id).update(
            stock=Greatest(F("stock") + delta, Value(0))
        )
        Product.objects.filter(pk=product_id, stock__gt=0).update(in_stock=True)
        zeroed = Product.objects.filter(pk=product_id, stock=0).update(in_stock=False)
    if zeroed:
        publish_event("inventory.stock.critical", {
            "product_id": product_id,
            "stock": 0,
        })
    return zeroed


def _handle_stock_changed(event, event_id=None):
    product_id = event.get("product_id")
    change = event.get("change", 0)
    if not product_id:
        logger.warning("inventory.stock.changed missing product_id")
        return
    try:
        _adjust_stock(product_id, change)
        logger.info("Stock synced | product=%s delta=%+d", product_id, change)
    except Exception as e:
        logger.error("Stock sync failed | product=%s error=%s", product_id, e)


def _handle_goods_received(event, event_id=None):
    product_id = event.get("product_id")
    quantity = event.get("quantity", 0)
    cost_price = event.get("cost_price", "0")
    if not product_id:
        logger.warning("inventory.goods_received missing product_id")
        return
    try:
        _adjust_stock(product_id, quantity)
        logger.info("Goods received processed | product=%s qty=%s cost=%s", product_id, quantity, cost_price)
    except Exception as e:
        logger.error("Goods received failed | product=%s error=%s", product_id, e)


QUEUE_MAP = {
    "product.stock.sync": with_dedup(_handle_stock_changed),
    "product.catalog.update": with_dedup(_handle_goods_received),
}


def setup_bindings(channel):
    """Declare exchange and bind queues to routing keys."""
    ensure_exchange(channel)
    for queue_name, routing_key in [
        ("product.stock.sync", "inventory.stock.changed"),
        ("product.catalog.update", "inventory.goods_received"),
    ]:
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(
            queue=queue_name, exchange=EXCHANGE_NAME, routing_key=routing_key
        )


def start_consumer():
    conn = get_connection()
    setup_bindings(conn.channel())
    # Purge ProcessedEvent records older than 7 days on startup
    cutoff = timezone.now() - timedelta(days=7)
    purged, _ = ProcessedEvent.objects.filter(processed_at__lt=cutoff).delete()
    if purged:
        logger.info("Purged %d stale ProcessedEvent records", purged)
    shared_start_consumer(QUEUE_MAP, "Product")
