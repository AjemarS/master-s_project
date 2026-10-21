"""
Purchasing: when to reorder, how much, from whom, and how deliveries settle purchase orders.
"""
from django.db.models import F, Sum
from rest_framework.exceptions import ValidationError

from .models import GoodsReceiptItem, PurchaseOrder, PurchaseOrderItem, Stock


def _pending(statuses, warehouse_id=None):
    """{(product_id, warehouse_id): units ordered but not yet delivered} for POs in these statuses."""
    items = PurchaseOrderItem.objects.filter(purchase_order__status__in=statuses)
    if warehouse_id:
        items = items.filter(purchase_order__warehouse_id=warehouse_id)
    rows = items.values("product_id", "purchase_order__warehouse_id").annotate(
        n=Sum(F("quantity") - F("received_quantity"))
    )
    return {(r["product_id"], r["purchase_order__warehouse_id"]): r["n"] or 0 for r in rows}


def _last_purchase(product_ids):
    """{product_id: (supplier_id, supplier_name, cost_price)} from each product's latest goods receipt."""
    latest = {}
    for item in (
        GoodsReceiptItem.objects.filter(product_id__in=product_ids)
        .select_related("goods_receipt__supplier")
        .order_by("product_id", "-goods_receipt__receipt_date", "-goods_receipt__created_at")
    ):
        if item.product_id not in latest:
            supplier = item.goods_receipt.supplier
            latest[item.product_id] = (supplier.pk, supplier.name, item.cost_price)
    return latest


def reorder_suggestions(warehouse_id=None):
    """
    Stock lines at or below their reorder point. Suggested quantity tops available stock up to
    reorder_point + reorder_quantity, minus what is already ordered (sent) or drafted.
    """
    stocks = Stock.objects.select_related("warehouse").filter(reorder_point__gt=0)
    if warehouse_id:
        stocks = stocks.filter(warehouse_id=warehouse_id)
    on_order = _pending(PurchaseOrder.OPEN, warehouse_id)
    drafted = _pending([PurchaseOrder.DRAFT], warehouse_id)

    low = [s for s in stocks if s.available <= s.reorder_point]
    last = _last_purchase([s.product_id for s in low])
    suggestions = []
    for s in low:
        key = (s.product_id, s.warehouse_id)
        target = s.reorder_point + s.reorder_quantity
        suggested = target - s.available - on_order.get(key, 0) - drafted.get(key, 0)
        if suggested <= 0:
            continue
        supplier_id, supplier_name, cost = last.get(s.product_id, (None, "", None))
        suggestions.append({
            "stock_id": s.pk,
            "product_id": s.product_id,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": s.warehouse.name,
            "available": s.available,
            "reorder_point": s.reorder_point,
            "reorder_quantity": s.reorder_quantity,
            "on_order": on_order.get(key, 0),
            "in_draft": drafted.get(key, 0),
            "suggested_quantity": suggested,
            "last_supplier_id": supplier_id,
            "last_supplier_name": supplier_name,
            "last_cost_price": str(cost) if cost is not None else None,
        })
    # Most urgent first: furthest below the reorder point
    suggestions.sort(key=lambda r: r["available"] - r["reorder_point"])
    return suggestions


def receive_against_order(grn, purchase_order):
    """
    Book a goods receipt's items onto its purchase order (caller holds a transaction).
    Rejects deliveries that do not match the order instead of guessing.
    """
    po = PurchaseOrder.objects.select_for_update().get(pk=purchase_order.pk)
    if po.status not in PurchaseOrder.OPEN:
        raise ValidationError({"purchase_order": f"Order #{po.pk} is {po.status}: only sent orders can be received."})
    if po.supplier_id != grn.supplier_id or po.warehouse_id != grn.warehouse_id:
        raise ValidationError({"purchase_order": "Supplier and warehouse must match the purchase order."})

    lines = {i.product_id: i for i in po.items.select_for_update()}
    for item in grn.items.all():
        line = lines.get(item.product_id)
        if line is None:
            raise ValidationError({"items": f"Product {item.product_id} is not on order #{po.pk}."})
        if line.received_quantity + item.quantity > line.quantity:
            left = line.quantity - line.received_quantity
            raise ValidationError({"items": f"Product {item.product_id}: {left} unit(s) left on order #{po.pk}, got {item.quantity}."})
        line.received_quantity += item.quantity
        line.save(update_fields=["received_quantity"])

    po.status = PurchaseOrder.RECEIVED if all(l.received_quantity >= l.quantity for l in lines.values()) else PurchaseOrder.PARTIAL
    po.save(update_fields=["status", "updated_at"])
    return po
