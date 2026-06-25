from decimal import Decimal
from django.conf import settings
from rest_framework import serializers

from .models import Category, Product


def _get_locale(request):
    """Extract locale from Accept-Language header. Default: uk."""
    if not request:
        return "uk"
    lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "uk")
    if lang.startswith("en"):
        return "en"
    return "uk"


def _localized(obj, field_base, locale):
    """Return field_base_{locale} if set, fallback to field_base."""
    val = getattr(obj, f"{field_base}_{locale}", "") or getattr(obj, field_base, "")
    return val


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "name_uk", "name_en", "parent",
            "image", "product_count", "children",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "name": {"required": True, "allow_blank": False, "max_length": 100},
            "name_uk": {"required": False, "allow_blank": True},
            "name_en": {"required": False, "allow_blank": True},
            "parent": {"required": False, "allow_null": True},
        }

    def get_product_count(self, obj):
        return obj.products.count()

    def get_children(self, obj):
        children = obj.children.all()
        if children:
            return CategorySerializer(children, many=True, context=self.context).data
        return []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        locale = _get_locale(self.context.get("request"))
        data["name"] = _localized(instance, "name", locale)
        return data

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
    category_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name", "name_uk", "name_en",
            "description", "description_uk", "description_en",
            "category", "category_name",
            "price", "original_price",
            "image_url", "stock", "in_stock",
            "features", "specs", "rating",
            "created_at", "updated_at",
        ]
        read_only_fields = ["in_stock", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"required": True, "allow_blank": False, "max_length": 200},
            "name_uk": {"required": False, "allow_blank": True},
            "name_en": {"required": False, "allow_blank": True},
            "description": {"required": True, "allow_blank": False},
            "description_uk": {"required": False, "allow_blank": True},
            "description_en": {"required": False, "allow_blank": True},
            "price": {"required": True, "min_value": 0},
            "original_price": {"required": False, "min_value": 0},
            "category": {"required": True},
            "rating": {"required": False},
            "features": {"required": False},
            "specs": {"required": False},
        }

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def get_category_name(self, obj):
        locale = _get_locale(self.context.get("request"))
        return _localized(obj.category, "name", locale)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        locale = _get_locale(self.context.get("request"))
        data["name"] = _localized(instance, "name", locale)
        data["description"] = _localized(instance, "description", locale)
        if locale == "en":
            rate = Decimal(str(getattr(settings, "UAH_TO_USD_RATE", 41.5)))
            price = Decimal(str(instance.price))
            orig = Decimal(str(instance.original_price))
            data["price_usd"] = round(float(price / rate), 2)
            data["original_price_usd"] = round(float(orig / rate), 2)
        return data

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
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value

    def validate_rating(self, value):
        from decimal import Decimal
        if value is not None:
            if Decimal("0") <= value <= Decimal("5"):
                return value
            raise serializers.ValidationError("Rating must be between 0 and 5.")
        return value

    def validate_features(self, value):
        if value is not None:
            if not isinstance(value, list):
                raise serializers.ValidationError("Features must be a list.")
            for item in value:
                if not isinstance(item, str):
                    raise serializers.ValidationError("Each feature must be a string.")
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
