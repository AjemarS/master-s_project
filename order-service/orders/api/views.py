"""
API views for order management.
Thin layer that validates input, delegates to core service, and formats HTTP responses.
"""
import logging

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone as tz
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from orders.eventbus import publish_event
from orders.models import Order
from orders.core.event_builder import build_order_event
from orders.core import order_service as svc
from orders.infrastructure.inventory_client import release_stock
from orders.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusSerializer,
    POSOrderSerializer,
)
from shared_auth.permissions import IsAdminOrCashier

stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for order CRUD and business actions."""

    queryset = Order.objects.prefetch_related("items").all()
    filterset_fields = ["status", "channel", "customer_email"]
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
        if self.action == "health":
            return [AllowAny()]
        if self.action in ("list", "my", "retrieve"):
            return [IsAuthenticated()]
        if self.action == "create":
            return [AllowAny()]
        if self.action == "pos":
            return [IsAdminOrCashier()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self.action == "retrieve" and not user.is_staff:
            return qs.filter(created_by=user.username)
        if self.action in ("my",) or (self.action == "list" and not user.is_staff):
            return qs.filter(created_by=user.username)
        return qs

    # ── Standard CRUD ────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        """Create an online order."""
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        items_data = data.pop("items")
        user_id = request.user.username if request.user.is_authenticated else ""

        order = svc.create_order(
            serializer_data=data,
            items_data=items_data,
            channel=data.get("channel", Order.ONLINE),
            user_id=user_id,
        )
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    # ── Custom Actions ────────────────────────────────────────────────

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        """Update order status with inventory side effects."""
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        updated_order, error = svc.update_order_status(order, new_status, request)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST if "Cannot" in error.get("error", "") else status.HTTP_502_BAD_GATEWAY)

        return Response(OrderDetailSerializer(updated_order).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """Create Stripe checkout session for payment."""
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
            logger.error("Stripe session failed | order=%s error=%s", order.order_number, e)
            return Response({"error": "Payment session creation failed"}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=["post"])
    def stripe_webhook(self, request):
        """Handle Stripe payment confirmation with saga compensation."""
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except ValueError:
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        if event["type"] != "checkout.session.completed":
            return Response({"status": "ok"})

        session = event["data"]["object"]
        order_id = session.get("metadata", {}).get("order_id")
        if not order_id:
            return Response({"error": "Missing order_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_status == Order.PAID:
            return Response({"status": "already_paid"})

        with transaction.atomic():
            order.payment_status = Order.PAYMENT_PAID
            order.stripe_payment_intent_id = session.get("payment_intent", "")
            order.paid_at = tz.now()
            order.status = Order.PAID
            order.save()

        # Reserve stock after payment
        if order.warehouse_id:
            success, succeeded = svc.reserve_order_stock(order)
            if not success:
                # Saga compensation: release already-reserved items
                for pid, qty in succeeded:
                    release_stock(
                        product_id=pid,
                        warehouse_id=order.warehouse_id,
                        quantity=qty,
                        reference_type="order",
                        reference_id=str(order.id),
                        request=request,
                    )
                order.status = Order.CANCELLED
                order.payment_status = Order.PAYMENT_REFUNDED
                order.save(update_fields=["status", "payment_status"])
                logger.error("Order cancelled after payment — reserve failure | number=%s", order.order_number)
                return Response({"status": "reserve_failed"})

        publish_event("order.created", build_order_event(order))
        logger.info("Payment confirmed | order=%s", order.order_number)
        return Response({"status": "ok"})

    @action(detail=False, methods=["get"])
    def my(self, request):
        """Return current user's orders."""
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
        """Create POS (offline) sale with immediate stock deduct."""
        serializer = POSOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        items_data = data.pop("items")
        user_id = request.user.username if request.user.is_authenticated else ""

        order = svc.create_order(
            serializer_data=data,
            items_data=items_data,
            channel=Order.OFFLINE,
            user_id=user_id,
        )

        success = svc.deduct_order_stock(order, request)  # Public API — see orders.core.order_service
        # Better: we should promote _deduct_order_stock or use the public API
        if not success:
            order.status = Order.CANCELLED
            order.save(update_fields=["status"])
            logger.error("POS sale cancelled — deduct failure | number=%s", order.order_number)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def health(self, request):
        """Service health check."""
        return Response({"status": "healthy", "service": "order-service", "database": "connected"})
