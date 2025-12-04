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
        return obj.products.filter(category_id=obj.id).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "originalPrice",
            "category_name",
            "image",
            "inStock",
            "features",
            "specs",
            "rating",
        ]

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Ціна не може бути від'ємною")
        return value

    def validate_originalPrice(self, value):
        if value < 0:
            raise serializers.ValidationError("Початкова ціна не може бути від'ємною")
        if "price" in self.initial_data:
            price = float(self.initial_data["price"])
            if value < price:
                raise serializers.ValidationError(
                    "Початкова ціна не може бути меншою за поточну ціну"
                )
        return value
