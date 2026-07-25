from rest_framework import serializers

from .models import (
    ActivityEvent,
    GoodsReceiptItem,
    GoodsReceiptNote,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)
from .validators import validate_product_exists


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "id",
            "name",
            "type",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class StockSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id",
            "product_id",
            "warehouse",
            "warehouse_name",
            "quantity",
            "reserved",
            "available",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "reserved"]


class StockMovementSerializer(serializers.ModelSerializer):
    from_warehouse_name = serializers.CharField(
        source="from_warehouse.name", read_only=True
    )
    to_warehouse_name = serializers.CharField(
        source="to_warehouse.name", read_only=True
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product_id",
            "from_warehouse",
            "from_warehouse_name",
            "to_warehouse",
            "to_warehouse_name",
            "quantity",
            "type",
            "reference_type",
            "reference_id",
            "notes",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class GoodsReceiptItemSerializer(serializers.ModelSerializer):
    def validate_product_id(self, value):
        validate_product_exists(value)
        return value

    class Meta:
        model = GoodsReceiptItem
        fields = [
            "id",
            "goods_receipt",
            "product_id",
            "quantity",
            "cost_price",
            "created_at",
        ]
        read_only_fields = ["created_at", "goods_receipt"]


class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    items = GoodsReceiptItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceiptNote
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "warehouse",
            "warehouse_name",
            "receipt_date",
            "reference_number",
            "notes",
            "created_by",
            "items",
            "total_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_total_amount(self, obj):
        return sum(item.quantity * item.cost_price for item in obj.items.all())


class GoodsReceiptNoteCreateSerializer(serializers.ModelSerializer):
    items = GoodsReceiptItemSerializer(many=True)

    class Meta:
        model = GoodsReceiptNote
        fields = [
            "supplier",
            "warehouse",
            "receipt_date",
            "reference_number",
            "notes",
            "created_by",
            "items",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        note = GoodsReceiptNote.objects.create(**validated_data)
        for item_data in items_data:
            GoodsReceiptItem.objects.create(goods_receipt=note, **item_data)
        return note


class ReserveStockSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="order")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_id(self, value):
        validate_product_exists(value)
        return value


class DeductStockSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="order")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_id(self, value):
        validate_product_exists(value)
        return value


class TransferStockSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    from_warehouse_id = serializers.IntegerField()
    to_warehouse_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="transfer")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_id(self, value):
        validate_product_exists(value)
        return value


class AdjustStockSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField()
    new_quantity = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_id(self, value):
        validate_product_exists(value)
        return value


class ActivityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "event_type",
            "message",
            "entity_type",
            "entity_id",
            "user_name",
            "user_email",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user_name",
            "user_email",
            "created_at",
        ]
