import json
import logging

import pika

from .connection import EXCHANGE_NAME, get_channel

logger = logging.getLogger(__name__)


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
        return True, None
    except Exception as e:
        logger.error("Event publish failed | key=%s error=%s", routing_key, e)
        return False, str(e)
