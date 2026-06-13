from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "image",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_product_count(self, obj):
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "price",
            "original_price",
            "image_url",
            "stock",
            "in_stock",
            "features",
            "specs",
            "rating",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["in_stock", "created_at", "updated_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Stock quantity cannot be negative."
            )
        return value

    def validate(self, attrs):
        original_price = attrs.get("original_price") or (
            self.instance.original_price if self.instance else None
        )
        price = attrs.get("price") or (
            self.instance.price if self.instance else None
        )
        if original_price is not None and price is not None:
            if original_price < price:
                raise serializers.ValidationError(
                    {"original_price": "Original price cannot be less than current price."}
                )
        return attrs
