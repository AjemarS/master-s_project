import logging
from uuid import uuid4

from django.conf import settings

from shared_eventbus.publisher import publish_event

logger = logging.getLogger(__name__)

LOW_STOCK_THRESHOLD = getattr(settings, "LOW_STOCK_THRESHOLD", 5)


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

