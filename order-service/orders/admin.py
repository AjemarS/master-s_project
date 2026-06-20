from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    readonly_fields = ["created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number", "channel", "status", "customer_name",
        "customer_email", "total_amount", "created_by", "created_at",
    ]
    list_filter = ["status", "channel", "created_at"]
    search_fields = ["order_number", "customer_name", "customer_email", "customer_phone"]
    readonly_fields = ["order_number", "created_at", "updated_at"]
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["order", "product_id", "product_name", "quantity", "price", "cost_price"]
