import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Order, OrderItem

logger = logging.getLogger(__name__)


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
    date_filter = _parse_date_params(request)
    order_filter = {"status__in": ["delivered", "completed"]}
    order_filter.update(date_filter)

    orders_qs = Order.objects.filter(**order_filter)
    items_qs = OrderItem.objects.filter(order__in=orders_qs)

    total_revenue = sum(item.price * item.quantity for item in items_qs)
    total_cost = sum(item.cost_price * item.quantity for item in items_qs)
    total_qty = sum(item.quantity for item in items_qs)

    by_channel = (
        orders_qs.values("channel")
        .annotate(count=Count("id"), revenue=Sum("total_amount"))
    )

    return Response({
        "total_orders": orders_qs.count(),
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
    date_filter = _parse_date_params(request)
    order_filter = {"status__in": ["delivered", "completed"]}
    order_filter.update(date_filter)

    orders_qs = Order.objects.filter(**order_filter)
    items_qs = OrderItem.objects.filter(order__in=orders_qs)

    total_revenue = sum(o.total_amount for o in orders_qs)
    total_cost = sum(item.cost_price * item.quantity for item in items_qs)

    return Response({
        "total_revenue": float(total_revenue),
        "total_cost": float(total_cost),
        "gross_margin": float(total_revenue - total_cost),
        "margin_percent": round(
            float((total_revenue - total_cost) / total_revenue * 100), 2
        ) if total_revenue else 0,
        "order_count": orders_qs.count(),
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inventory_value_report(request):
    """
    Inventory value report — actual on-hand stock valued at current product price.

    Fetches all stock entries from inventory-service, groups by product,
    then fetches current price from product-service for each unique product.
    """
    stock_url = f"{settings.INVENTORY_SERVICE_URL}/api/stock/"
    product_base_url = f"{settings.PRODUCT_SERVICE_URL}/api/products"

    # ── Fetch all stock entries from inventory-service (paginated) ──────────
    try:
        stock_entries = _fetch_all_pages(stock_url)
    except requests.RequestException as e:
        logger.error("inventory_value_report: inventory-service unreachable: %s", e)
        return Response(
            {"error": "Inventory service unreachable", "detail": str(e)},
            status=503,
        )

    # Early exit: no stock records
    if not stock_entries:
        return Response({
            "total_value": 0.0,
            "item_count": 0,
            "by_product": [],
        })

    # ── Group stock by product_id, sum quantities across warehouses ─────────
    product_totals: dict[int, int] = {}
    for entry in stock_entries:
        pid = int(entry["product_id"])
        qty = int(entry.get("quantity", 0))
        product_totals[pid] = product_totals.get(pid, 0) + qty

    # ── Fetch product details from product-service (with caching) ──────────
    price_cache: dict[int, float] = {}
    name_cache: dict[int, str] = {}
    by_product = []

    for pid, total_qty in product_totals.items():
        if pid not in price_cache:
            try:
                resp = requests.get(f"{product_base_url}/{pid}/", timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    price_cache[pid] = float(data.get("price", 0))
                    name_cache[pid] = data.get("name", f"Product #{pid}")
                else:
                    logger.warning(
                        "inventory_value_report: product %d returned HTTP %d — skipping",
                        pid, resp.status_code,
                    )
                    continue
            except requests.RequestException as e:
                logger.warning(
                    "inventory_value_report: failed to fetch product %d: %s — skipping",
                    pid, e,
                )
                continue

        product_value = round(total_qty * price_cache[pid], 2)
        by_product.append({
            "product_id": pid,
            "product_name": name_cache[pid],
            "total_quantity": total_qty,
            "total_value": product_value,
        })

    total_value = round(sum(item["total_value"] for item in by_product), 2)

    return Response({
        "total_value": total_value,
        "item_count": len(by_product),
        "by_product": by_product,
    })


def _fetch_all_pages(url: str) -> list[dict]:
    """
    Fetch all pages from a paginated DRF endpoint.

    Handles PageNumberPagination (count/next/previous/results format).
    """
    all_results: list[dict] = []
    next_url: str | None = url

    while next_url:
        resp = requests.get(next_url, timeout=10)
        resp.raise_for_status()
        body = resp.json()

        # DRF paginated response
        if "results" in body:
            all_results.extend(body["results"])
            next_url = body.get("next")
        else:
            # Non-paginated or single-page response
            all_results.extend(body if isinstance(body, list) else [body])
            break

    return all_results


@api_view(["GET"])
@permission_classes([IsAdminUser])
def daily_sales_report(request):
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
