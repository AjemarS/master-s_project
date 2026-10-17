"""
Outbox for events the broker did not accept: publish_event() stores them here and a
background thread in the same process re-sends them, oldest first, once RabbitMQ is back.

shortcut: an event is stored only when publishing fails, not in the business transaction,
so a process killed between commit and publish still loses it; upgrade to writing the row
inside the transaction if that window matters.
"""
import logging
import threading
import time

from django.db import close_old_connections, connection, transaction
from django.db.models import F

logger = logging.getLogger(__name__)

RETRY_INTERVAL = 5  # seconds
_lock = threading.Lock()
_running = False


def store(routing_key, event_data, error):
    from .models import OutboxEvent

    try:
        OutboxEvent.objects.create(routing_key=routing_key, payload=event_data, last_error=str(error))
    except Exception:
        logger.exception("Outbox write failed, event lost | key=%s", routing_key)
        return
    _ensure_relay()


def relay_pending(limit=100):
    """Publish queued events oldest first; stop at the first failure. Returns how many are still queued."""
    from .models import OutboxEvent
    from .publisher import send

    with transaction.atomic():
        for row in OutboxEvent.objects.select_for_update(skip_locked=True)[:limit]:
            try:
                send(row.routing_key, row.payload, own_connection=True)
            except Exception as e:
                OutboxEvent.objects.filter(pk=row.pk).update(attempts=F("attempts") + 1, last_error=str(e))
                break
            row.delete()
            logger.info("Outbox event delivered | key=%s id=%s", row.routing_key, row.pk)
    return OutboxEvent.objects.count()


def _ensure_relay():
    """Start the relay thread on the first failed publish; it then stays up (one COUNT query per interval)."""
    global _running
    with _lock:
        if _running:
            return
        _running = True
    threading.Thread(target=_relay_loop, name="outbox-relay", daemon=True).start()


def _relay_loop():
    while True:
        time.sleep(RETRY_INTERVAL)
        close_old_connections()
        try:
            relay_pending()
        except Exception:
            logger.exception("Outbox relay failed")
            connection.close()
