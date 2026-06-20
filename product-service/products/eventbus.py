import json
import logging
import os
import threading

import pika

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "techhub.events"
EXCHANGE_TYPE = "topic"

_connection = None
_channel = None
_lock = threading.Lock()


def _get_rabbitmq_url():
    return os.environ.get("RABBITMQ_URL", "amqp://techhub:techhub@rabbitmq:5672/")


def _ensure_exchange(channel):
    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type=EXCHANGE_TYPE,
        durable=True,
    )


def get_connection():
    global _connection
    if _connection is None or _connection.is_closed:
        url = _get_rabbitmq_url()
        params = pika.URLParameters(url)
        params.heartbeat = 600
        params.blocked_connection_timeout = 300
        _connection = pika.BlockingConnection(params)
    return _connection


def get_channel():
    global _channel
    with _lock:
        if _channel is None or _channel.is_closed:
            conn = get_connection()
            _channel = conn.channel()
            _ensure_exchange(_channel)
        return _channel


def declare_queues(channel):
    _ensure_exchange(channel)
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


def health_check():
    try:
        conn = get_connection()
        conn.process_data_events(time_limit=1)
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def start_consumer():
    try:
        conn = get_connection()
        channel = conn.channel()
        declare_queues(channel)

        def callback(ch, method, properties, body):
            try:
                event = json.loads(body.decode())
                event_id = properties.message_id or event.get("event_id", "")
                routing_key = method.routing_key
                logger.info(
                    "Event received | key=%s event_id=%s", routing_key, event_id
                )
                _handle_event(routing_key, event, event_id)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                logger.error("Event processing failed: %s", e)
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(
            queue="product.stock.sync", on_message_callback=callback
        )
        channel.basic_consume(
            queue="product.catalog.update", on_message_callback=callback
        )
        logger.info("Product consumer started. Waiting for events...")
        channel.start_consuming()
    except Exception as e:
        logger.error("Consumer error: %s", e)


def _handle_event(routing_key, event, event_id):
    from django.db import transaction

    from products.models import ProcessedEvent

    if ProcessedEvent.objects.filter(event_id=event_id).exists():
        logger.info("Duplicate event ignored | event_id=%s", event_id)
        return

    with transaction.atomic():
        ProcessedEvent.objects.create(event_id=event_id)

        if routing_key == "inventory.stock.changed":
            _handle_stock_changed(event)
        elif routing_key == "inventory.goods_received":
            _handle_goods_received(event)


def _handle_stock_changed(event):
    from django.db.models import F

    from products.models import Product

    product_id = event.get("product_id")
    quantity = event.get("quantity", 0)

    if not product_id:
        logger.warning("inventory.stock.changed missing product_id")
        return

    try:
        Product.objects.filter(pk=product_id).update(stock=quantity)
        Product.objects.filter(pk=product_id, stock__gt=0).update(in_stock=True)
        Product.objects.filter(pk=product_id, stock=0).update(in_stock=False)
        logger.info("Stock synced | product=%s total_stock=%s", product_id, quantity)
    except Exception as e:
        logger.error("Stock sync failed | product=%s error=%s", product_id, e)


def _handle_goods_received(event):
    from products.models import Product

    product_id = event.get("product_id")
    quantity = event.get("quantity", 0)

    if product_id:
        logger.info(
            "Goods received event | product=%s qty=%s", product_id, quantity
        )
