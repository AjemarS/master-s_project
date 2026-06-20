
from django.db.models import Count, F, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Order, OrderItem


@api_view(["GET"])
@permission_classes([IsAdminUser])
def sales_report(request):
    items = OrderItem.objects.filter(order__status__in=["shipped", "delivered"])
    total_revenue = sum(item.price * item.quantity for item in items)
    total_cost = sum(item.cost_price * item.quantity for item in items)
    total_qty = sum(item.quantity for item in items)

    by_channel = (
        Order.objects.filter(status__in=["shipped", "delivered"])
        .values("channel")
        .annotate(
            count=Count("id"),
            revenue=Sum("total_amount"),
        )
    )

    return Response({
        "total_orders": Order.objects.filter(
            status__in=["shipped", "delivered"]
        ).count(),
        "total_quantity": total_qty,
        "total_revenue": float(total_revenue),
        "total_cost": float(total_cost),
        "total_margin": float(total_revenue - total_cost),
        "margin_percent": round(
            float((total_revenue - total_cost) / total_revenue * 100), 2
        ) if total_revenue else 0,
        "by_channel": list(by_channel),
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def revenue_report(request):
    orders = Order.objects.filter(status__in=["shipped", "delivered"])
    total_revenue = sum(o.total_amount for o in orders)

    items = OrderItem.objects.filter(
        order__status__in=["shipped", "delivered"]
    )
    total_cost = sum(item.cost_price * item.quantity for item in items)

    return Response({
        "total_revenue": float(total_revenue),
        "total_cost": float(total_cost),
        "gross_margin": float(total_revenue - total_cost),
        "margin_percent": round(
            float((total_revenue - total_cost) / total_revenue * 100), 2
        ) if total_revenue else 0,
        "order_count": orders.count(),
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inventory_value_report(request):
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
        "total_inventory_value": float(total_inventory_value),
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
