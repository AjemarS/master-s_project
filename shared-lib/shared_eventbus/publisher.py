import json
import logging

import pika

from .connection import EXCHANGE_NAME, _get_rabbitmq_url, ensure_exchange, get_channel

logger = logging.getLogger(__name__)


def send(routing_key, event_data, own_connection=False):
    """Publish one event; raises on failure. own_connection: for threads other than the request thread (pika is not thread-safe)."""
    connection = pika.BlockingConnection(pika.URLParameters(_get_rabbitmq_url())) if own_connection else None
    try:
        channel = connection.channel() if connection else get_channel()
        if connection:
            ensure_exchange(channel)
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=json.dumps(event_data, default=str).encode(),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json",
                message_id=event_data.get("event_id", ""),
            ),
        )
    finally:
        if connection:
            connection.close()


def publish_event(routing_key, event_data):
    event_id = event_data.get("event_id", "")
    try:
        send(routing_key, event_data)
        logger.info("Event published | key=%s event_id=%s", routing_key, event_id)
        return True, None
    except Exception as e:
        logger.error("Event publish failed, queued in outbox | key=%s event_id=%s error=%s", routing_key, event_id, e)
        from .outbox import store

        # JSON round-trip: the outbox JSONField needs plain types (Decimal, datetime -> str), as on the wire
        store(routing_key, json.loads(json.dumps(event_data, default=str)), e)
        return False, str(e)
