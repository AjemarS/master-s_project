from django.contrib import admin

from .models import (
    GoodsReceiptItem,
    GoodsReceiptNote,
    ProcessedEvent,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "address", "is_active", "created_at"]
    list_filter = ["type", "is_active"]
    search_fields = ["name", "address"]


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_person", "phone", "email", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "contact_person", "email"]


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ["product_id", "warehouse", "quantity", "reserved", "available"]
    list_filter = ["warehouse"]
    search_fields = ["product_id"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = [
        "product_id",
        "type",
        "quantity",
        "from_warehouse",
        "to_warehouse",
        "reference_type",
        "reference_id",
        "created_at",
    ]
    list_filter = ["type", "created_at"]
    search_fields = ["product_id", "reference_id"]


@admin.register(GoodsReceiptNote)
class GoodsReceiptNoteAdmin(admin.ModelAdmin):
    list_display = ["id", "supplier", "warehouse", "receipt_date", "created_by", "created_at"]
    list_filter = ["supplier", "warehouse", "receipt_date"]
    search_fields = ["reference_number", "notes"]


@admin.register(GoodsReceiptItem)
class GoodsReceiptItemAdmin(admin.ModelAdmin):
    list_display = ["goods_receipt", "product_id", "quantity", "cost_price"]


@admin.register(ProcessedEvent)
class ProcessedEventAdmin(admin.ModelAdmin):
    list_display = ["event_id", "processed_at"]
    readonly_fields = ["event_id", "processed_at"]
