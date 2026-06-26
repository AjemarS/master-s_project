import logging
from datetime import timezone
from decimal import Decimal
from uuid import uuid4

import requests
import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone as tz
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .eventbus import publish_event
from .models import Order, OrderItem
from shared_auth.permissions import IsAdminOrCashier
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusSerializer,
    POSOrderSerializer,
)

stripe.api_key = settings.STRIPE_SECRET_KEY

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


def _call_inventory(method, path, json_data=None, request=None, idempotency_key=None):
    url = _inventory_url(path)
    headers = {}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    if request:
        for meta_key, header_name in [
            ("HTTP_X_GATEWAY_USER_ID", "X-Gateway-User-Id"),
            ("HTTP_X_GATEWAY_USER_ROLE", "X-Gateway-User-Role"),
            ("HTTP_X_GATEWAY_USER_USERNAME", "X-Gateway-User-Username"),
            ("HTTP_X_GATEWAY_USER_EMAIL", "X-Gateway-User-Email"),
        ]:
            if meta_key in request.META:
                headers[header_name] = request.META[meta_key]
    try:
        if method == "POST":
            resp = requests.post(url, json=json_data, timeout=10, headers=headers)
        elif method == "GET":
            resp = requests.get(url, timeout=10, headers=headers)
        else:
            return None, "Unsupported method"
        if resp.status_code in (200, 201):
            return resp.json(), None
        if resp.status_code == 409:
            return resp.json(), None
        return None, resp.json().get("error", f"HTTP {resp.status_code}")
    except requests.RequestException as e:
        logger.error("Inventory call failed: %s %s - %s", method, url, e)
        return None, str(e)


def _generate_order_number(attempt=0):
    import random
    import time
    ts = int(time.time() * 1000) % 100000
    rnd = random.randint(100, 999)
    if attempt == 0:
        return f"ORD-{ts}{rnd}"
    return f"ORD-{ts}{rnd}-{attempt}"


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
        if self.action in ("pay", "stripe_webhook"):
            return None
        return OrderDetailSerializer

    def get_permissions(self):
        if self.action == "stripe_webhook":
            return [AllowAny()]
        if self.action in ("list", "my"):
            return [IsAuthenticated()]
        if self.action == "retrieve":
            return [IsAuthenticated()]
        if self.action in ("create",):
            return [AllowAny()]
        if self.action == "pos":
            return [IsAdminOrCashier()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self.action == "retrieve" and not user.is_staff:
            return qs.filter(created_by=user.username)
        if self.action == "my" or (self.action == "list" and not user.is_staff):
            return qs.filter(created_by=user.username)
        return qs

    def perform_create(self, serializer):
        pass

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        items_data = data.pop("items")

        user_id = request.user.username if request.user.is_authenticated else ""
        total = sum(Decimal(str(i["price"])) * i["quantity"] for i in items_data)

        for attempt in range(3):
            try:
                order_number = _generate_order_number(attempt)
                with transaction.atomic():
                    order = Order.objects.create(
                        order_number=order_number,
                        channel=data.get("channel", Order.ONLINE),
                        status=Order.UNPAID,
                        warehouse_id=data.get("warehouse_id"),
                        customer_name=data.get("customer_name", ""),
                        customer_phone=data.get("customer_phone", ""),
                        customer_email=data.get("customer_email", ""),
                        total_amount=total,
                        notes=data.get("notes", ""),
                        created_by=user_id,
                    )
                break
            except IntegrityError:
                if attempt == 2:
                    raise

            for item in items_data:
                OrderItem.objects.create(
                    order=order,
                    product_id=item["product_id"],
                    product_name=item.get("product_name", ""),
                    quantity=item["quantity"],
                    price=item["price"],
                    cost_price=item.get("cost_price", Decimal("0.00")),
                )

            transaction.on_commit(
                lambda: publish_event("order.created", _build_order_event(order))
            )

        logger.info("Order created | number=%s channel=%s", order.order_number, order.channel)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    def _reserve_stock(self, order):
        all_success = True
        succeeded = []
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
                    "idempotency_key": f"reserve-{order.id}-{item.product_id}",
                },
                request=self.request,
                idempotency_key=f"reserve-{order.id}-{item.product_id}",
            )
            if error:
                logger.error(
                    "Stock reserve failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )
                all_success = False
            else:
                succeeded.append((item.product_id, item.quantity))
        return all_success, succeeded

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

            transaction.on_commit(
                lambda: publish_event("order.status_changed", _build_order_event(order))
            )
            if new_status == Order.CANCELLED:
                transaction.on_commit(
                    lambda: publish_event("order.cancelled", _build_order_event(order))
                )

        if new_status == Order.CANCELLED and order.warehouse_id:
            self._release_stock(order)

        if new_status == Order.DELIVERING and order.warehouse_id:
            success, succeeded = self._deduct_stock(order)
            if not success:
                order.status = old_status
                order.save(update_fields=["status"])
                logger.error(
                    "Status change reverted due to deduct failure | order=%s %s->%s",
                    order.order_number, old_status, new_status,
                )
                return Response(
                    {"error": "Stock deduct failed, status reverted", "detail": "Inventory service error"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

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
                    "idempotency_key": f"release-{order.id}-{item.product_id}",
                },
                request=self.request,
                idempotency_key=f"release-{order.id}-{item.product_id}",
            )
            if error:
                logger.error(
                    "Stock release failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )

    def _deduct_stock(self, order):
        all_success = True
        succeeded = []
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
                    "idempotency_key": f"deduct-{order.id}-{item.product_id}",
                },
                request=self.request,
                idempotency_key=f"deduct-{order.id}-{item.product_id}",
            )
            if error:
                logger.error(
                    "Stock deduct failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, error,
                )
                all_success = False
            else:
                succeeded.append((item.product_id, item.quantity))
        return all_success, succeeded

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()

        if order.payment_status != Order.PAYMENT_UNPAID:
            return Response(
                {"error": "Order already paid", "payment_status": order.payment_status},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = stripe.checkout.Session.create(
                line_items=[
                    {
                        "price_data": {
                            "currency": "uah",
                            "product_data": {"name": item.product_name or f"Product #{item.product_id}"},
                            "unit_amount": int(item.price * 100),
                        },
                        "quantity": item.quantity,
                    }
                    for item in order.items.all()
                ],
                mode="payment",
                client_reference_id=str(order.id),
                customer_email=order.customer_email or None,
                metadata={"order_id": order.id},
                success_url=settings.PUBLIC_BASE_URL + "/checkout/success?order_id=" + str(order.id),
                cancel_url=settings.PUBLIC_BASE_URL + "/checkout?order_id=" + str(order.id),
            )

            order.stripe_session_id = session.id
            order.save(update_fields=["stripe_session_id"])

            return Response({"checkout_url": session.url, "session_id": session.id})

        except stripe.error.StripeError as e:
            logger.error("Stripe session creation failed | order=%s error=%s", order.order_number, e)
            return Response(
                {"error": "Payment session creation failed"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=["post"])
    def stripe_webhook(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            order_id = session.get("metadata", {}).get("order_id")
            if not order_id:
                logger.warning("Stripe webhook missing order_id in metadata")
                return Response({"error": "Missing order_id"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                order = Order.objects.get(pk=order_id)
            except Order.DoesNotExist:
                logger.error("Stripe webhook order not found | id=%s", order_id)
                return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

            if order.payment_status == Order.PAID:
                logger.info("Stripe webhook duplicate | order=%s already paid", order.order_number)
                return Response({"status": "already_paid"})

            with transaction.atomic():
                order.payment_status = Order.PAYMENT_PAID
                order.stripe_payment_intent_id = session.get("payment_intent", "")
                order.paid_at = tz.now()
                order.status = Order.PAID
                order.save()

            if order.warehouse_id:
                success, succeeded = self._reserve_stock(order)
                if not success:
                    for pid, qty in succeeded:
                        _call_inventory(
                            "POST", "stock/release/",
                            {
                                "product_id": pid,
                                "warehouse_id": order.warehouse_id,
                                "quantity": qty,
                                "reference_type": "order",
                                "reference_id": str(order.id),
                            },
                            request=request,
                        )
                    order.status = Order.CANCELLED
                    order.payment_status = Order.PAYMENT_REFUNDED
                    order.save(update_fields=["status", "payment_status"])
                    logger.error(
                        "Order cancelled after payment due to reserve failure | number=%s",
                        order.order_number,
                    )
                    return Response({"status": "reserve_failed"})

            publish_event("order.created", _build_order_event(order))
            logger.info("Payment confirmed | order=%s", order.order_number)

        return Response({"status": "ok"})

    @action(detail=False, methods=["get"])
    def my(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=401)
        gateway_id = request.META.get("HTTP_X_GATEWAY_USER_ID", "")
        if gateway_id:
            orders = Order.objects.filter(created_by=gateway_id).prefetch_related("items")
        else:
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
        user_id = request.user.username if request.user.is_authenticated else ""
        total = sum(Decimal(str(i["price"])) * i["quantity"] for i in items_data)

        for attempt in range(3):
            try:
                order_number = _generate_order_number(attempt)
                with transaction.atomic():
                    order = Order.objects.create(
                        order_number=order_number,
                        channel=Order.OFFLINE,
                        status=Order.UNPAID,
                        warehouse_id=data["warehouse_id"],
                        customer_name=data.get("customer_name", ""),
                        customer_phone=data.get("customer_phone", ""),
                        customer_email=data.get("customer_email", ""),
                        total_amount=total,
                        notes=data.get("notes", ""),
                        created_by=user_id,
                    )
                break
            except IntegrityError:
                if attempt == 2:
                    raise

            for item in items_data:
                OrderItem.objects.create(
                    order=order,
                    product_id=item["product_id"],
                    product_name=item.get("product_name", ""),
                    quantity=item["quantity"],
                    price=item["price"],
                    cost_price=item.get("cost_price", Decimal("0.00")),
                )

            transaction.on_commit(
                lambda: publish_event("order.created", _build_order_event(order))
            )

        success, succeeded = self._deduct_stock(order)
        if not success:
            order.status = Order.CANCELLED
            order.save(update_fields=["status"])
            logger.error(
                "POS sale cancelled due to deduct failure | number=%s",
                order.order_number,
            )

        logger.info("POS sale created | number=%s success=%s", order.order_number, success)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
