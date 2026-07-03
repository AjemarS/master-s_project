"""
Service layer for stock operations used by event consumers.
Encapsulates atomic stock movements so eventbus handlers don't contain raw DB queries.
"""
import logging

from django.db import transaction
from django.db.models import F

from .models import Stock, StockMovement

logger = logging.getLogger(__name__)


def async_reserve(order_id, warehouse_id, items):
    """Reserve stock for each item in an order. Called from order.created consumer."""
    if not warehouse_id or not items:
        logger.warning("order.created missing warehouse_id or items")
        return

    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        try:
            stock = Stock.objects.select_for_update().get(product_id=product_id, warehouse_id=warehouse_id)
            available = stock.quantity - stock.reserved
            if available >= quantity:
                Stock.objects.filter(product_id=product_id, warehouse_id=warehouse_id).update(reserved=F("reserved") + quantity)
                StockMovement.objects.create(
                    product_id=product_id, from_warehouse_id=warehouse_id, quantity=quantity,
                    type=StockMovement.RESERVE, reference_type="order", reference_id=str(order_id),
                )
                logger.info("Async reserve | product=%s warehouse=%s qty=%d", product_id, warehouse_id, quantity)
            else:
                logger.warning("Async reserve insufficient | product=%s available=%d needed=%d", product_id, available, quantity)
        except Stock.DoesNotExist:
            logger.warning("Async reserve no stock | product=%s warehouse=%s", product_id, warehouse_id)


def async_release(order_id, warehouse_id, items):
    """Release reserved stock for a cancelled order. Called from order.cancelled consumer."""
    if not warehouse_id or not items:
        return

    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        try:
            stock = Stock.objects.select_for_update().get(product_id=product_id, warehouse_id=warehouse_id)
            release_qty = min(quantity, stock.reserved)
            if release_qty > 0:
                Stock.objects.filter(product_id=product_id, warehouse_id=warehouse_id).update(reserved=F("reserved") - release_qty)
                StockMovement.objects.create(
                    product_id=product_id, from_warehouse_id=warehouse_id, quantity=release_qty,
                    type=StockMovement.RELEASE, reference_type="order", reference_id=str(order_id),
                )
                logger.info("Async release | product=%s warehouse=%s qty=%d", product_id, warehouse_id, release_qty)
        except Stock.DoesNotExist:
            pass
