from datetime import datetime, timedelta

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Order, OrderItem


def _parse_date_params(request):
    raw_from = request.query_params.get("from")
    raw_to = request.query_params.get("to")
    filters = {}
    if raw_from:
        try:
            filters["created_at__gte"] = datetime.fromisoformat(raw_from)
        except (ValueError, TypeError):
            pass
    if raw_to:
        try:
            filters["created_at__lte"] = datetime.fromisoformat(raw_to)
        except (ValueError, TypeError):
            pass
    return filters


@api_view(["GET"])
@permission_classes([IsAdminUser])
def sales_report(request):
    """Sales report with database-level aggregation instead of Python loops."""
    date_filter = _parse_date_params(request)
    order_filter = {"status__in": ["delivered", "completed"]}
    order_filter.update(date_filter)
    orders_qs = Order.objects.filter(**order_filter)
    agg = orders_qs.aggregate(
        total_orders=Count("id"),
        total_revenue=Sum("total_amount"),
    )
    items_qs = OrderItem.objects.filter(order__in=orders_qs)
    items_agg = items_qs.aggregate(
        total_quantity=Sum("quantity"),
        total_cost=Sum(F("cost_price") * F("quantity")),
    )
    total_revenue = float(agg["total_revenue"] or 0)
    total_cost = float(items_agg["total_cost"] or 0)
    total_qty = items_agg["total_quantity"] or 0
    by_channel = (
        orders_qs.values("channel")
        .annotate(count=Count("id"), revenue=Sum("total_amount"))
    )
    return Response({
        "total_orders": agg["total_orders"],
        "total_quantity": total_qty,
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_margin": total_revenue - total_cost,
        "margin_percent": round(
            float((total_revenue - total_cost) / total_revenue * 100), 2
        ) if total_revenue else 0,
        "by_channel": list(by_channel),
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def revenue_report(request):
    """Revenue and margin report with database-level aggregation."""
    date_filter = _parse_date_params(request)
    order_filter = {"status__in": ["delivered", "completed"]}
    order_filter.update(date_filter)
    orders_qs = Order.objects.filter(**order_filter)
    order_agg = orders_qs.aggregate(
        total_revenue=Sum("total_amount"),
        order_count=Count("id"),
    )
    items_qs = OrderItem.objects.filter(order__in=orders_qs)
    items_agg = items_qs.aggregate(
        total_cost=Sum(F("cost_price") * F("quantity")),
    )
    total_revenue = float(order_agg["total_revenue"] or 0)
    total_cost = float(items_agg["total_cost"] or 0)
    return Response({
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "gross_margin": total_revenue - total_cost,
        "margin_percent": round(
            float((total_revenue - total_cost) / total_revenue * 100), 2
        ) if total_revenue else 0,
        "order_count": order_agg["order_count"],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inventory_value_report(request):
    """Inventory value report based on sold items' cost data."""
    items_by_product = (
        OrderItem.objects.values("product_id", "product_name")
        .annotate(
            total_quantity=Sum("quantity"),
            total_cost=Sum(F("cost_price") * F("quantity")),
        )
        .order_by("-total_cost")
    )
    total_inventory_value = sum(
        item["total_cost"] for item in items_by_product
    )
    return Response({
        "total_value": float(total_inventory_value),
        "item_count": len(items_by_product),
        "by_product": [
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "total_quantity": item["total_quantity"],
                "total_cost": float(item["total_cost"]),
            }
            for item in items_by_product
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def daily_sales_report(request):
    """Daily sales aggregation for the last 30 days."""
    thirty_days_ago = datetime.now() - timedelta(days=30)
    orders = Order.objects.filter(
        status__in=["paid", "delivering", "delivered", "completed"],
        created_at__gte=thirty_days_ago,
    )
    daily = (
        orders.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            revenue=Sum("total_amount"),
            count=Count("id"),
        )
        .order_by("day")
    )
    return Response({
        "daily": [
            {
                "date": entry["day"].isoformat(),
                "revenue": float(entry["revenue"]),
                "orders": entry["count"],
            }
            for entry in daily
        ],
    })
