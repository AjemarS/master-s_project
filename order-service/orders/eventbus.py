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


def health_check():
    try:
        conn = get_connection()
        conn.process_data_events(time_limit=1)
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


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
