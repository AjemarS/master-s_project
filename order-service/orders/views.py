import logging
from decimal import Decimal
from uuid import uuid4

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .eventbus import publish_event
from .models import Order, OrderItem
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusSerializer,
    POSOrderSerializer,
)

logger = logging.getLogger(__name__)


def _build_order_event(order):
    return {
        "event_id": str(uuid4()),
        "order_id": order.id,
        "order_number": order.order_number,
        "channel": order.channel,
        "status": order.status,
        "warehouse_id": order.warehouse_id,
        "total_amount": str(order.total_amount),
        "customer_email": order.customer_email,
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "price": str(item.price),
            }
            for item in order.items.all()
        ],
    }


def _inventory_url(path):
    return f"{settings.INVENTORY_SERVICE_URL}/api/{path}"


def _call_inventory(method, path, json_data=None):
    url = _inventory_url(path)
    try:
        if method == "POST":
            resp = requests.post(url, json=json_data, timeout=10)
        elif method == "GET":
            resp = requests.get(url, timeout=10)
        else:
            return None, "Unsupported method"
        if resp.status_code in (200, 201):
            return resp.json(), None
        return None, resp.json().get("error", f"HTTP {resp.status_code}")
    except requests.RequestException as e:
        logger.error("Inventory call failed: %s %s - %s", method, url, e)
        return None, str(e)


def _generate_order_number():
    import random
    import time
    ts = int(time.time() * 1000) % 100000
    rnd = random.randint(100, 999)
    return f"ORD-{ts}{rnd}"


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related("items").all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "channel", "customer_email"]
    search_fields = ["order_number", "customer_name", "customer_phone", "customer_email"]
    ordering_fields = ["created_at", "total_amount", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        if self.action in ("create", "pos"):
            return OrderCreateSerializer
        return OrderDetailSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "my"):
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ("pos",):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self.action == "my" or (self.action == "list" and not user.is_staff):
            return qs.filter(created_by=str(user.id))
        return qs

    def perform_create(self, serializer):
        pass

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        items_data = data.pop("items")

        order_number = _generate_order_number()
        user_id = request.user.username if request.user.is_authenticated else ""
        total = sum(Decimal(str(i["price"])) * i["quantity"] for i in items_data)

        with transaction.atomic():
            order = Order.objects.create(
                order_number=order_number,
                channel=data.get("channel", Order.ONLINE),
                status=Order.PENDING,
                warehouse_id=data.get("warehouse_id"),
                customer_name=data.get("customer_name", ""),
                customer_phone=data.get("customer_phone", ""),
                customer_email=data.get("customer_email", ""),
                total_amount=total,
                notes=data.get("notes", ""),
                created_by=user_id,
            )

            for item in items_data:
                OrderItem.objects.create(
                    order=order,
                    product_id=item["product_id"],
                    product_name=item.get("product_name", ""),
                    quantity=item["quantity"],
                    price=item["price"],
                    cost_price=item.get("cost_price", Decimal("0.00")),
                )

        if data.get("channel") == Order.ONLINE and data.get("warehouse_id"):
            self._reserve_stock(order)

        publish_event("order.created", _build_order_event(order))
        logger.info("Order created | number=%s channel=%s", order.order_number, order.channel)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    def _reserve_stock(self, order):
        for item in order.items.all():
            result, error = _call_inventory(
                "POST",
                "stock/reserve/",
                {
                    "product_id": item.product_id,
                    "warehouse_id": order.warehouse_id,
                    "quantity": item.quantity,
                    "reference_type": "order",
                    "reference_id": str(order.id),
                },
            )
            if error:
                logger.error(
                    "Stock reserve failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]

        if not order.can_transition_to(new_status):
            return Response(
                {
                    "error": f"Cannot transition from {order.status} to {new_status}",
                    "allowed": Order.STATUS_TRANSITIONS.get(order.status, []),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.status
        with transaction.atomic():
            order.status = new_status
            order.save()

            if new_status == Order.CANCELLED and order.warehouse_id:
                self._release_stock(order)

            if new_status == Order.SHIPPED and order.warehouse_id:
                self._deduct_stock(order)

        publish_event("order.status_changed", _build_order_event(order))
        if new_status == Order.CANCELLED:
            publish_event("order.cancelled", _build_order_event(order))
        logger.info(
            "Order status changed | number=%s %s->%s",
            order.order_number, old_status, new_status,
        )

        return Response(OrderDetailSerializer(order).data)

    def _release_stock(self, order):
        for item in order.items.all():
            result, error = _call_inventory(
                "POST",
                "stock/release/",
                {
                    "product_id": item.product_id,
                    "warehouse_id": order.warehouse_id,
                    "quantity": item.quantity,
                    "reference_type": "order",
                    "reference_id": str(order.id),
                },
            )
            if error:
                logger.error(
                    "Stock release failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )

    def _deduct_stock(self, order):
        for item in order.items.all():
            result, error = _call_inventory(
                "POST",
                "stock/deduct/",
                {
                    "product_id": item.product_id,
                    "warehouse_id": order.warehouse_id,
                    "quantity": item.quantity,
                    "reference_type": "order",
                    "reference_id": str(order.id),
                },
            )
            if error:
                logger.error(
                    "Stock deduct failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )

    @action(detail=False, methods=["get"])
    def my(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=401)
        orders = Order.objects.filter(created_by=str(request.user.id)).prefetch_related("items")
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = OrderListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def pos(self, request):
        serializer = POSOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        items_data = data.pop("items")
        order_number = _generate_order_number()
        user_id = request.user.username if request.user.is_authenticated else ""
        total = sum(Decimal(str(i["price"])) * i["quantity"] for i in items_data)

        with transaction.atomic():
            order = Order.objects.create(
                order_number=order_number,
                channel=Order.OFFLINE,
                status=Order.PENDING,
                warehouse_id=data["warehouse_id"],
                customer_name=data.get("customer_name", ""),
                customer_phone=data.get("customer_phone", ""),
                customer_email=data.get("customer_email", ""),
                total_amount=total,
                notes=data.get("notes", ""),
                created_by=user_id,
            )

            for item in items_data:
                OrderItem.objects.create(
                    order=order,
                    product_id=item["product_id"],
                    product_name=item.get("product_name", ""),
                    quantity=item["quantity"],
                    price=item["price"],
                    cost_price=item.get("cost_price", Decimal("0.00")),
                )

        self._deduct_stock(order)
        publish_event("order.created", _build_order_event(order))
        logger.info("POS sale created | number=%s", order.order_number)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
