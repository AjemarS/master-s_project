from django.contrib import admin
from .models import Product, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "price",
        "originalPrice",
        "inStock",
        "category",
        "features",
        "specs",
        "image",
        "rating",
        "created_at",
    ]
    # list_filter = ["category", "created_at"]
    # search_fields = ["name", "description"]
    # list_editable = ["price", "originalPrice", "inStock", "features", "specs", "rating"]
