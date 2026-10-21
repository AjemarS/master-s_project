from rest_framework import serializers

from .models import (
    ActivityEvent,
    GoodsReceiptItem,
    GoodsReceiptNote,
    PurchaseOrder,
    PurchaseOrderItem,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)
from shared_auth.permissions import IsAdminOrWarehouseWorker

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
            "reorder_point",
            "reorder_quantity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "reserved", "reorder_point", "reorder_quantity"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Stock levels are public, purchasing plans are not
        request = self.context.get("request")
        if not (request and IsAdminOrWarehouseWorker().has_permission(request, None)):
            data.pop("reorder_point")
            data.pop("reorder_quantity")
        return data


class ReorderSettingsSerializer(serializers.Serializer):
    reorder_point = serializers.IntegerField(min_value=0, max_value=100000)
    reorder_quantity = serializers.IntegerField(min_value=0, max_value=100000)


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
            "purchase_order",
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
            "purchase_order",
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


class ProductInfoInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField()


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


class DeductBatchItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class DeductBatchSerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()
    items = DeductBatchItemSerializer(many=True, allow_empty=False)
    # True when the units were reserved for this order (shipping); False for a direct sale (POS)
    from_reserved = serializers.BooleanField(default=False)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="order")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, default="")


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


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    remaining_quantity = serializers.SerializerMethodField()

    def validate_product_id(self, value):
        validate_product_exists(value)
        return value

    def get_remaining_quantity(self, obj):
        return obj.quantity - obj.received_quantity

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "product_id", "quantity", "unit_cost", "received_quantity", "remaining_quantity"]
        read_only_fields = ["received_quantity"]
        extra_kwargs = {"quantity": {"min_value": 1}, "unit_cost": {"min_value": 0}}


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Create and edit a draft; items are replaced as a whole on update."""

    items = PurchaseOrderItemSerializer(many=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "supplier", "supplier_name", "warehouse", "warehouse_name", "status",
            "expected_date", "notes", "items", "total_amount", "created_by", "sent_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["status", "created_by", "sent_at", "created_at", "updated_at"]

    def get_total_amount(self, obj):
        return str(sum(i.quantity * i.unit_cost for i in obj.items.all()))

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        ids = [i["product_id"] for i in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Each product can appear only once.")
        return value

    def create(self, validated_data):
        items = validated_data.pop("items")
        po = PurchaseOrder.objects.create(**validated_data)
        PurchaseOrderItem.objects.bulk_create(PurchaseOrderItem(purchase_order=po, **i) for i in items)
        return po

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            PurchaseOrderItem.objects.bulk_create(PurchaseOrderItem(purchase_order=instance, **i) for i in items)
        return instance


class PurchaseOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[PurchaseOrder.SENT, PurchaseOrder.CANCELLED])
