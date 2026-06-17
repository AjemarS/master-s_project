from rest_framework import serializers

from .models import Category, Product


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
        extra_kwargs = {
            "name": {"required": True, "allow_blank": False, "max_length": 100},
        }

    def get_product_count(self, obj):
        return obj.products.count()

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Category name cannot be blank.")
        return value.strip()

    def validate_image(self, value):
        if value:
            allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
            if hasattr(value, "content_type") and value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    f"Unsupported image type. Allowed: {', '.join(allowed_types)}"
                )
        return value


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
        extra_kwargs = {
            "name": {"required": True, "allow_blank": False, "max_length": 200},
            "description": {"required": True, "allow_blank": False},
            "price": {"required": True, "min_value": 0},
            "original_price": {"required": False, "min_value": 0},
            "category": {"required": True},
            "rating": {"required": False},
            "features": {"required": False},
            "specs": {"required": False},
        }

    def get_image_url(self, obj):
        if obj.image:
            # Return relative path so the frontend can construct the
            # correct absolute URL from its configured API base.
            return obj.image.url
        return None

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product name cannot be blank.")
        return value.strip()

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product description cannot be blank.")
        return value.strip()

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Stock quantity cannot be negative."
            )
        return value

    def validate_rating(self, value):
        from decimal import Decimal
        if value is not None:
            if Decimal("0") <= value <= Decimal("5"):
                return value
            raise serializers.ValidationError(
                "Rating must be between 0 and 5."
            )
        return value

    def validate_features(self, value):
        if value is not None:
            if not isinstance(value, list):
                raise serializers.ValidationError("Features must be a list.")
            for item in value:
                if not isinstance(item, str):
                    raise serializers.ValidationError(
                        "Each feature must be a string."
                    )
        return value

    def validate_specs(self, value):
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Specs must be a dictionary.")
        return value

    def validate(self, attrs):
        original_price = attrs.get("original_price") or (
            self.instance.original_price if self.instance else None
        )
        price = attrs.get("price") or (
            self.instance.price if self.instance else None
        )
        if original_price is not None and price is not None and original_price < price:
            raise serializers.ValidationError(
                {"original_price": "Original price cannot be less than current price."}
            )
        return attrs
