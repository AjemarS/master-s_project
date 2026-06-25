from rest_framework import serializers

from .cart_models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(
        source="product.price", max_digits=10, decimal_places=2, read_only=True
    )
    product_image = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(source="product.stock", read_only=True)
    created_at = serializers.DateTimeField(source="added_at", read_only=True)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_price",
            "product_image",
            "product_stock",
            "quantity",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_product_image(self, obj):
        if obj.product.image:
            return obj.product.image.url
        return None

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "user_id", "session_id", "items", "subtotal", "item_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_subtotal(self, obj):
        return float(sum(item.product.price * item.quantity for item in obj.items.all()))

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())
