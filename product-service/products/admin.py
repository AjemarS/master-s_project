from django.contrib import admin

from .models import Category, ProcessedEvent, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(ProcessedEvent)
class ProcessedEventAdmin(admin.ModelAdmin):
    list_display = ["event_id", "processed_at"]
    readonly_fields = ["event_id", "processed_at"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "price",
        "original_price",
        "in_stock",
        "category",
        "features",
        "specs",
        "image",
        "rating",
        "created_at",
    ]
    # list_filter = ["category", "created_at"]
    # search_fields = ["name", "description"]
    # list_editable = ["price", "original_price", "in_stock", "features", "specs", "rating"]
