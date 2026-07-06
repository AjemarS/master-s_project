import logging

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import Order, OrderItem
from .inventory_client import check_availability

logger = logging.getLogger(__name__)


def _validate_stock(data):
    warehouse_id = data.get("warehouse_id")
    items = data.get("items", [])
    if not warehouse_id or not items:
        return
    for item in items:
        ok, msg = check_availability(
            product_id=item["product_id"],
            warehouse_id=warehouse_id,
            quantity=item["quantity"],
        )
        if ok is False:
            raise ValidationError(
                f"Product {item.get('product_name', item['product_id'])}: {msg}"
            )
        if ok is None:
            logger.warning("Stock check unavailable for product=%s", item["product_id"])


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "product_id",
            "product_name",
            "quantity",
            "price",
            "cost_price",
            "created_at",
        ]
        read_only_fields = ["created_at", "order"]


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "channel",
            "status",
            "payment_status",
            "warehouse_id",
            "delivery_method",
            "shipping_city",
            "shipping_address",
            "shipping_cost",
            "customer_name",
            "customer_phone",
            "customer_email",
            "total_amount",
            "item_count",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "channel",
            "status",
            "payment_status",
            "paid_at",
            "warehouse_id",
            "delivery_method",
            "shipping_city",
            "shipping_address",
            "shipping_cost",
            "customer_name",
            "customer_phone",
            "customer_email",
            "total_amount",
            "notes",
            "items",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class OrderDetailForAdminSerializer(OrderDetailSerializer):
    """Serializer with payment details for admin/staff use only."""

    class Meta(OrderDetailSerializer.Meta):
        fields = OrderDetailSerializer.Meta.fields + ["stripe_session_id", "stripe_payment_intent_id"]


class OrderCreateItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    cost_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, default="0.00"
    )


class OrderCreateSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=Order.CHANNEL_CHOICES, default=Order.ONLINE)
    warehouse_id = serializers.IntegerField(required=False, allow_null=True)
    delivery_method = serializers.ChoiceField(choices=Order.DELIVERY_CHOICES, default=Order.PICKUP)
    shipping_city = serializers.CharField(required=False, allow_blank=True, default="")
    shipping_address = serializers.CharField(required=False, allow_blank=True, default="")
    shipping_cost = serializers.DecimalField(max_digits=10, decimal_places=2, default="0.00")
    customer_name = serializers.CharField(required=False, allow_blank=True, default="")
    customer_phone = serializers.CharField(required=False, allow_blank=True, default="")
    customer_email = serializers.EmailField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = OrderCreateItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate_warehouse_id(self, value):
        channel = self.initial_data.get("channel", Order.ONLINE)
        if channel == Order.OFFLINE and not value:
            raise serializers.ValidationError(
                "Warehouse is required for offline (POS) orders."
            )
        return value

    def validate(self, data):
        _validate_stock(data)
        return data

class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)


class POSOrderSerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()
    delivery_method = serializers.ChoiceField(choices=Order.DELIVERY_CHOICES, default=Order.PICKUP)
    shipping_city = serializers.CharField(required=False, allow_blank=True, default="")
    shipping_address = serializers.CharField(required=False, allow_blank=True, default="")
    shipping_cost = serializers.DecimalField(max_digits=10, decimal_places=2, default="0.00")
    customer_name = serializers.CharField(required=False, allow_blank=True, default="")
    customer_phone = serializers.CharField(required=False, allow_blank=True, default="")
    customer_email = serializers.EmailField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = OrderCreateItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate(self, data):
        _validate_stock(data)
        return data
