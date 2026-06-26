import logging

from shared_eventbus.connection import ensure_exchange, get_connection
from shared_eventbus.consumer import start_consumer as shared_start_consumer
from shared_eventbus.publisher import publish_event

from .models import ProcessedEvent  # noqa: F401

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "techhub.events"


def declare_queues(channel):
    ensure_exchange(channel)
    channel.queue_declare(queue="product.stock.sync", durable=True)
    channel.queue_bind(
        queue="product.stock.sync",
        exchange=EXCHANGE_NAME,
        routing_key="inventory.stock.changed",
    )
    channel.queue_declare(queue="product.catalog.update", durable=True)
    channel.queue_bind(
        queue="product.catalog.update",
        exchange=EXCHANGE_NAME,
        routing_key="inventory.goods_received",
    )


def _handle_stock_changed(event):
    from django.db.models import F
    from .models import Product

    product_id = event.get("product_id")
    change = event.get("change", 0)
    if not product_id:
        logger.warning("inventory.stock.changed missing product_id")
        return
    try:
        Product.objects.filter(pk=product_id).update(stock=F("stock") + change)
        Product.objects.filter(pk=product_id, stock__gt=0).update(in_stock=True)
        Product.objects.filter(pk=product_id, stock=0).update(in_stock=False)
        logger.info("Stock synced | product=%s delta=%+d", product_id, change)
    except Exception as e:
        logger.error("Stock sync failed | product=%s error=%s", product_id, e)


def _handle_goods_received(event):
    from django.db.models import F
    from .models import Product

    product_id = event.get("product_id")
    quantity = event.get("quantity", 0)
    cost_price = event.get("cost_price", "0")
    if not product_id:
        logger.warning("inventory.goods_received missing product_id")
        return
    try:
        Product.objects.filter(pk=product_id).update(stock=F("stock") + quantity)
        Product.objects.filter(pk=product_id, stock__gt=0).update(in_stock=True)
        Product.objects.filter(pk=product_id, stock=0).update(in_stock=False)
        logger.info("Goods received processed | product=%s qty=%s cost=%s", product_id, quantity, cost_price)
    except Exception as e:
        logger.error("Goods received failed | product=%s error=%s", product_id, e)


QUEUE_MAP = {
    "product.stock.sync": lambda event, event_id: _handle_stock_changed(event),
    "product.catalog.update": lambda event, event_id: _handle_goods_received(event),
}


def start_consumer():
    declare_queues(get_connection().channel())
    shared_start_consumer(QUEUE_MAP, "Product")
