from rest_framework import serializers

from .models import Order, OrderItem


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
            "stripe_session_id",
            "stripe_payment_intent_id",
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
