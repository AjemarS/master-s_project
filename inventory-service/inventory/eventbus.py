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


def publish_event(routing_key, event_data):
    try:
        channel = get_channel()
        event_id = event_data.get("event_id", "")
        message = json.dumps(event_data, default=str)
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=message.encode(),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json",
                message_id=event_id,
            ),
        )
        logger.info("Event published | key=%s event_id=%s", routing_key, event_id)
        return True
    except Exception as e:
        logger.error("Event publish failed | key=%s error=%s", routing_key, e)
        return False


def declare_queues(channel):
    _ensure_exchange(channel)

    # Queues for Inventory Service
    channel.queue_declare(queue="inventory.order.reserve", durable=True)
    channel.queue_bind(
        queue="inventory.order.reserve",
        exchange=EXCHANGE_NAME,
        routing_key="order.created",
    )
    channel.queue_declare(queue="inventory.order.release", durable=True)
    channel.queue_bind(
        queue="inventory.order.release",
        exchange=EXCHANGE_NAME,
        routing_key="order.cancelled",
    )

    # Publisher-only queues (declare for safety)
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
            queue="inventory.order.reserve", on_message_callback=callback
        )
        channel.basic_consume(
            queue="inventory.order.release", on_message_callback=callback
        )
        logger.info("Inventory consumer started. Waiting for events...")
        channel.start_consuming()
    except Exception as e:
        logger.error("Consumer error: %s", e)


def _handle_event(routing_key, event, event_id):
    from django.db import transaction

    from .models import ProcessedEvent

    if ProcessedEvent.objects.filter(event_id=event_id).exists():
        logger.info("Duplicate event ignored | event_id=%s", event_id)
        return

    with transaction.atomic():
        ProcessedEvent.objects.create(event_id=event_id)

        if routing_key == "order.created":
            _handle_order_created(event)
        elif routing_key == "order.cancelled":
            _handle_order_cancelled(event)


def _handle_order_created(event):
    from django.db.models import F

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
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )
            available = stock.quantity - stock.reserved
            if available >= quantity:
                Stock.objects.filter(
                    product_id=product_id, warehouse_id=warehouse_id
                ).update(reserved=F("reserved") + quantity)
                StockMovement.objects.create(
                    product_id=product_id,
                    from_warehouse_id=warehouse_id,
                    quantity=quantity,
                    type=StockMovement.RESERVE,
                    reference_type="order",
                    reference_id=str(order_id),
                )
                logger.info(
                    "Async reserve | product=%s warehouse=%s qty=%d",
                    product_id, warehouse_id, quantity,
                )
            else:
                logger.warning(
                    "Async reserve insufficient | product=%s available=%d needed=%d",
                    product_id, available, quantity,
                )
        except Stock.DoesNotExist:
            logger.warning(
                "Async reserve no stock | product=%s warehouse=%s",
                product_id, warehouse_id,
            )


def _handle_order_cancelled(event):
    from django.db.models import F

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
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )
            release_qty = min(quantity, stock.reserved)
            if release_qty > 0:
                Stock.objects.filter(
                    product_id=product_id, warehouse_id=warehouse_id
                ).update(reserved=F("reserved") - release_qty)
                StockMovement.objects.create(
                    product_id=product_id,
                    from_warehouse_id=warehouse_id,
                    quantity=release_qty,
                    type=StockMovement.RELEASE,
                    reference_type="order",
                    reference_id=str(order_id),
                )
                logger.info(
                    "Async release | product=%s warehouse=%s qty=%d",
                    product_id, warehouse_id, release_qty,
                )
        except Stock.DoesNotExist:
            pass
