from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    productCount = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "image",
            "productCount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_productCount(self, obj):
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    categoryName = serializers.CharField(source="category.name", read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "originalPrice",
            "categoryName",
            "image",
            "stock",
            "inStock",
            "features",
            "specs",
            "rating",
        ]

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Кількість на складі не може бути від'ємною"
            )
        return value

    def validate(self, data):
        # Перевірка, що originalPrice >= price
        if "originalPrice" in data and "price" in data:
            if data["originalPrice"] < data["price"]:
                raise serializers.ValidationError(
                    {
                        "originalPrice": "Початкова ціна не може бути меншою за поточну ціну"
                    }
                )
        return data
