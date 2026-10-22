import logging
from datetime import datetime, time, timedelta
from decimal import Decimal
from statistics import median

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Max, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .inventory_client import get_stock_valuation
from .models import Order, OrderItem, OrderStatusHistory

logger = logging.getLogger(__name__)


# One definition of "sold" for every report: money received, cancellations and unpaid carts excluded
SOLD_STATUSES = [Order.PAID, Order.DELIVERING, Order.DELIVERED, Order.COMPLETED]
LINE_REVENUE = ExpressionWrapper(F("price") * F("quantity"), output_field=DecimalField())
LINE_COST = ExpressionWrapper(F("cost_price") * F("quantity"), output_field=DecimalField())


def _parse_bound(raw, name, end_of_day):
    """ISO date or datetime -> aware datetime. A bare `to` date covers that whole day."""
    try:
        value = datetime.fromisoformat(raw)
    except ValueError:
        raise ValidationError({name: f"Invalid date: {raw!r}, expected ISO 8601 (YYYY-MM-DD)"})
    if end_of_day and len(raw) == 10:
        value += timedelta(days=1)
    return timezone.make_aware(value) if timezone.is_naive(value) else value


def _date_range(request):
    """(start, end) with end exclusive; either may be None."""
    raw_from = request.query_params.get("from")
    raw_to = request.query_params.get("to")
    start = _parse_bound(raw_from, "from", end_of_day=False) if raw_from else None
    end = _parse_bound(raw_to, "to", end_of_day=True) if raw_to else None
    return start, end


def _in_range(qs, start, end):
    if start:
        qs = qs.filter(created_at__gte=start)
    if end:
        qs = qs.filter(created_at__lt=end)
    return qs


def _sold_orders(request):
    start, end = _date_range(request)
    return _in_range(Order.objects.filter(status__in=SOLD_STATUSES), start, end)


def _totals(orders_qs):
    """Goods revenue net of promo discounts (shipping excluded), cost and margin for the given orders."""
    agg = OrderItem.objects.filter(order__in=orders_qs).aggregate(
        revenue=Sum(LINE_REVENUE), cost=Sum(LINE_COST), quantity=Sum("quantity"),
    )
    discount = orders_qs.aggregate(d=Sum("discount_amount"))["d"] or Decimal("0")
    revenue = (agg["revenue"] or Decimal("0")) - discount
    cost = agg["cost"] or Decimal("0")
    return {
        "discount": discount,
        "revenue": revenue,
        "cost": cost,
        "margin": revenue - cost,
        "margin_percent": round(float((revenue - cost) / revenue * 100), 2) if revenue else 0,
        "quantity": agg["quantity"] or 0,
        "orders": orders_qs.count(),
    }


def _kpis(start, end):
    """Headline numbers for one period: the same block for the current and the previous period."""
    t = _totals(_in_range(Order.objects.filter(status__in=SOLD_STATUSES), start, end))
    cancelled = _in_range(Order.objects.filter(status=Order.CANCELLED), start, end).count()
    placed = t["orders"] + cancelled
    return {
        "total_orders": t["orders"],
        "total_quantity": t["quantity"],
        "total_revenue": float(t["revenue"]),
        "total_cost": float(t["cost"]),
        "total_margin": float(t["margin"]),
        "margin_percent": t["margin_percent"],
        "total_discount": float(t["discount"]),
        "average_order_value": round(float(t["revenue"]) / t["orders"], 2) if t["orders"] else 0,
        "cancelled_orders": cancelled,
        "cancellation_rate": round(cancelled / placed * 100, 2) if placed else 0,
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def sales_report(request):
    start, end = _date_range(request)
    orders_qs = _sold_orders(request)

    by_channel = (
        OrderItem.objects.filter(order__in=orders_qs)
        .values(channel=F("order__channel"))
        .annotate(count=Count("order", distinct=True), revenue=Sum(LINE_REVENUE))
        .order_by("channel")
    )
    discount_by_channel = dict(
        orders_qs.values("channel").annotate(d=Sum("discount_amount")).values_list("channel", "d")
    )

    return Response({
        **_kpis(start, end),
        # The equal-length window right before [from, to): only defined when both bounds are given
        "previous": _kpis(start - (end - start), start) if start and end else None,
        "by_channel": [
            {
                "channel": row["channel"], "count": row["count"],
                "revenue": float((row["revenue"] or 0) - (discount_by_channel.get(row["channel"]) or 0)),
            }
            for row in by_channel
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def revenue_report(request):
    # Same numbers as sales_report by construction; kept for the existing dashboard cards
    t = _totals(_sold_orders(request))
    return Response({
        "total_revenue": float(t["revenue"]),
        "total_cost": float(t["cost"]),
        "gross_margin": float(t["margin"]),
        "margin_percent": t["margin_percent"],
        "order_count": t["orders"],
    })


def _product_sales(request):
    """(queryset of per-product sales, total goods revenue) for the request's period."""
    items = OrderItem.objects.filter(order__in=_sold_orders(request))
    total_revenue = items.aggregate(r=Sum(LINE_REVENUE))["r"] or Decimal("0")
    rows = items.values("product_id").annotate(
        # Names are snapshotted per sale; if the product was renamed one of the names is shown
        product_name=Max("product_name"),
        units=Sum("quantity"),  # not "quantity": that would shadow the field inside LINE_REVENUE
        revenue=Sum(LINE_REVENUE),
        margin=Sum(LINE_REVENUE) - Sum(LINE_COST),
        orders=Count("order", distinct=True),
    )
    return rows, total_revenue


def _product_row(r, total_revenue):
    return {
        "product_id": r["product_id"],
        "product_name": r["product_name"] or f"#{r['product_id']}",
        "quantity": r["units"],
        "orders": r["orders"],
        "revenue": float(r["revenue"]),
        "margin": float(r["margin"]),
        "margin_percent": round(float(r["margin"] / r["revenue"] * 100), 2) if r["revenue"] else 0,
        "revenue_share": round(float(r["revenue"] / total_revenue * 100), 2) if total_revenue else 0,
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def top_products_report(request):
    # Per-product figures are before order-level promo discounts, which are not split by product
    sort = request.query_params.get("sort", "revenue")
    if sort not in ("revenue", "quantity", "margin"):
        raise ValidationError({"sort": "Expected one of: revenue, quantity, margin"})
    try:
        limit = min(max(int(request.query_params.get("limit", 10)), 1), 100)
    except ValueError:
        raise ValidationError({"limit": "Expected an integer"})

    rows, total_revenue = _product_sales(request)
    rows = rows.order_by("-units" if sort == "quantity" else f"-{sort}", "product_id")[:limit]
    return Response({"sort": sort, "products": [_product_row(r, total_revenue) for r in rows]})


# Pareto split of sold products by cumulative revenue share
ABC_LIMITS = (("A", 80), ("B", 95), ("C", 100))


@api_view(["GET"])
@permission_classes([IsAdminUser])
def abc_report(request):
    """
    ABC analysis: products sorted by revenue; A brings the first 80% of revenue, B the next 15%, C the rest.
    A product's class is decided by the cumulative share *before* it, so the top seller is always A.
    Products with no sales in the period are not here (see inventory-service stock/analytics dead stock).
    """
    rows, total_revenue = _product_sales(request)
    products, cumulative = [], 0.0
    for r in rows.order_by("-revenue", "product_id"):
        row = _product_row(r, total_revenue)
        row["abc_class"] = next(cls for cls, limit in ABC_LIMITS if cumulative < limit)
        cumulative += float(r["revenue"] / total_revenue * 100) if total_revenue else 0
        row["cumulative_share"] = round(cumulative, 2)
        products.append(row)

    classes = {
        cls: {
            "products": sum(1 for p in products if p["abc_class"] == cls),
            "revenue": round(sum(p["revenue"] for p in products if p["abc_class"] == cls), 2),
            "revenue_share": round(sum(p["revenue_share"] for p in products if p["abc_class"] == cls), 2),
        }
        for cls, _ in ABC_LIMITS
    }
    return Response({"classes": classes, "products": products})


# The happy path of an online order, in order
STAGES = [Order.UNPAID, Order.PAID, Order.DELIVERING, Order.DELIVERED, Order.COMPLETED]


def _hours_stats(values):
    if not values:
        return {"count": 0, "avg_hours": None, "median_hours": None}
    return {
        "count": len(values),
        "avg_hours": round(sum(values) / len(values), 2),
        "median_hours": round(median(values), 2),
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def fulfillment_report(request):
    """
    Funnel and time between stages for orders created in [from, to), online by default (?channel=).
    POS sales jump straight to completed, so they would only flatten the funnel.
    Orders created before status history existed count by their current status only.
    """
    channel = request.query_params.get("channel", Order.ONLINE)
    if channel not in (Order.ONLINE, Order.OFFLINE):
        raise ValidationError({"channel": "Expected online or offline"})
    start, end = _date_range(request)
    orders = _in_range(Order.objects.filter(channel=channel), start, end)

    # shortcut: walks the period's history rows in Python; fine for thousands of orders, move to SQL window functions beyond that
    created = dict(orders.values_list("id", "created_at"))
    status = dict(orders.values_list("id", "status"))
    reached = {oid: {Order.UNPAID: created[oid]} for oid in created}
    cancelled_from = {}
    for oid, frm, to, at in (
        OrderStatusHistory.objects.filter(order_id__in=created)
        .order_by("changed_at").values_list("order_id", "from_status", "to_status", "changed_at")
    ):
        if to == Order.CANCELLED:
            cancelled_from[oid] = frm
        else:
            reached[oid].setdefault(to, at)

    funnel = []
    for i, stage in enumerate(STAGES):
        later = STAGES[i:]
        count = sum(
            1 for oid in created
            if stage in reached[oid] or status[oid] in later
            # a cancelled order got at least as far as the stage it was cancelled from
            or (oid in cancelled_from and cancelled_from[oid] in later)
        )
        funnel.append({"stage": stage, "count": count})

    durations = []
    for frm, to in zip(STAGES, STAGES[1:]):
        hours = [
            (r[to] - r[frm]).total_seconds() / 3600
            for r in reached.values() if frm in r and to in r
        ]
        durations.append({"from": frm, "to": to, **_hours_stats(hours)})

    cancelled = [oid for oid in created if status[oid] == Order.CANCELLED]
    return Response({
        "channel": channel,
        "orders": len(created),
        "funnel": funnel,
        "payment_conversion": round(funnel[1]["count"] / len(created) * 100, 2) if created else 0,
        "cancelled": {
            "total": len(cancelled),
            "by_stage": {
                stage: sum(1 for oid in cancelled if cancelled_from.get(oid) == stage)
                for stage in STAGES[:-1]
            },
            # cancelled before history was recorded
            "unknown_stage": sum(1 for oid in cancelled if oid not in cancelled_from),
        },
        "durations": durations,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inventory_value_report(request):
    """On-hand stock valued at weighted-average cost, aggregated by inventory-service."""
    data, error = get_stock_valuation(request)
    if error:
        logger.error("inventory_value_report: inventory-service error: %s", error)
        return Response({"error": "Inventory service unreachable", "detail": error}, status=503)
    return Response(data)


TRUNC = {"day": TruncDate, "week": TruncWeek, "month": TruncMonth}


def _period_start(day, group):
    if group == "week":
        return day - timedelta(days=day.weekday())
    if group == "month":
        return day.replace(day=1)
    return day


def _next_period(day, group):
    if group == "week":
        return day + timedelta(days=7)
    if group == "month":
        return (day.replace(day=28) + timedelta(days=4)).replace(day=1)
    return day + timedelta(days=1)


def _as_date(value):
    # TruncWeek/TruncMonth return aware datetimes, TruncDate returns dates
    return timezone.localtime(value).date() if isinstance(value, datetime) else value


@api_view(["GET"])
@permission_classes([IsAdminUser])
def daily_sales_report(request):
    """Revenue and order count per day, week or month (?group=), zero-filled."""
    group = request.query_params.get("group", "day")
    if group not in TRUNC:
        raise ValidationError({"group": "Expected one of: day, week, month"})
    start, end = _date_range(request)
    today = timezone.localdate()
    first_day = timezone.localtime(start).date() if start else today - timedelta(days=29)
    last_day = timezone.localtime(end - timedelta(microseconds=1)).date() if end else today
    if (last_day - first_day).days > 366 * 3:
        raise ValidationError({"from": "Range is limited to 3 years"})

    orders_qs = Order.objects.filter(
        status__in=SOLD_STATUSES,
        created_at__gte=timezone.make_aware(datetime.combine(first_day, time.min)),
        created_at__lt=timezone.make_aware(datetime.combine(last_day + timedelta(days=1), time.min)),
    )
    trunc = TRUNC[group]
    revenue_by_period = {
        _as_date(k): v for k, v in
        OrderItem.objects.filter(order__in=orders_qs)
        .annotate(period=trunc("order__created_at"))
        .values("period").annotate(revenue=Sum(LINE_REVENUE)).values_list("period", "revenue")
    }
    orders_by_period, discount_by_period = {}, {}
    for k, n, d in (
        orders_qs.annotate(period=trunc("created_at"))
        .values("period").annotate(n=Count("id"), d=Sum("discount_amount")).values_list("period", "n", "d")
    ):
        orders_by_period[_as_date(k)] = n
        discount_by_period[_as_date(k)] = d or 0

    # Zero-filled so charts show quiet periods instead of skipping them
    periods, day = [], _period_start(first_day, group)
    while day <= last_day:
        periods.append(day)
        day = _next_period(day, group)
    return Response({
        "group": group,
        "daily": [
            {
                "date": p.isoformat(),
                "revenue": float((revenue_by_period.get(p) or 0) - discount_by_period.get(p, 0)),
                "orders": orders_by_period.get(p, 0),
            }
            for p in periods
        ],
    })
