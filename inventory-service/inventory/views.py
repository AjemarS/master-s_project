import logging
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .eventbus import publish_event
from .filters import StockFilter, StockMovementFilter
from .models import GoodsReceiptNote, Stock, StockMovement, Supplier, Warehouse
from .permissions import IsAdminOrWarehouseWorker
from .serializers import (
    AdjustStockSerializer,
    DeductStockSerializer,
    GoodsReceiptNoteCreateSerializer,
    GoodsReceiptNoteSerializer,
    ReserveStockSerializer,
    StockMovementSerializer,
    StockSerializer,
    SupplierSerializer,
    TransferStockSerializer,
    WarehouseSerializer,
)

logger = logging.getLogger(__name__)

LOW_STOCK_THRESHOLD = getattr(settings, "LOW_STOCK_THRESHOLD", 5)


def _check_and_publish_low_stock(product_id: int, warehouse_id: int, quantity: int, warehouse_name: str = ""):
    """Publish inventory.low_stock if quantity is at or below threshold."""
    if quantity <= LOW_STOCK_THRESHOLD:
        publish_event(
            "inventory.low_stock",
            {
                "event_id": str(uuid4()),
                "product_id": product_id,
                "warehouse_id": warehouse_id,
                "warehouse_name": warehouse_name,
                "quantity": quantity,
            },
        )
        logger.info("Low stock alert | product=%s warehouse=%s qty=%d", product_id, warehouse_id, quantity)


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "address"]
    ordering_fields = ["name", "type", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "stock"):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Warehouse created | id=%s name=%r", instance.pk, instance.name)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Warehouse updated | id=%s name=%r", instance.pk, instance.name)

    def perform_destroy(self, instance):
        logger.warning("Warehouse deleted | id=%s name=%r", instance.pk, instance.name)
        instance.delete()

    @action(detail=True, methods=["get"])
    def stock(self, request, pk=None):
        warehouse = self.get_object()
        stocks = Stock.objects.filter(warehouse=warehouse).select_related("warehouse")
        page = self.paginate_queryset(stocks)
        if page is not None:
            serializer = StockSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "contact_person", "email", "phone"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Supplier created | id=%s name=%r", instance.pk, instance.name)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Supplier updated | id=%s name=%r", instance.pk, instance.name)

    def perform_destroy(self, instance):
        logger.warning("Supplier deleted | id=%s name=%r", instance.pk, instance.name)
        instance.delete()


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related("warehouse").all()
    serializer_class = StockSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = StockFilter
    ordering_fields = ["product_id", "quantity", "warehouse__name"]
    ordering = ["product_id"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "movements"):
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ("transfer", "adjust", "release"):
            return [IsAdminOrWarehouseWorker()]
        return [IsAdminUser()]

    @action(detail=False, methods=["post"])
    def reserve(self, request):
        serializer = ReserveStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        warehouse_id = serializer.validated_data["warehouse_id"]
        quantity = serializer.validated_data["quantity"]
        reference_type = serializer.validated_data.get("reference_type", "order")
        reference_id = serializer.validated_data.get("reference_id", "")

        with transaction.atomic():
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )

            available = stock.quantity - stock.reserved
            if available < quantity:
                return Response(
                    {
                        "error": "Insufficient available stock",
                        "available": available,
                        "requested": quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            Stock.objects.filter(
                product_id=product_id, warehouse_id=warehouse_id
            ).update(reserved=F("reserved") + quantity)
            stock.refresh_from_db()

            StockMovement.objects.create(
                product_id=product_id,
                from_warehouse_id=warehouse_id,
                quantity=quantity,
                type=StockMovement.RESERVE,
                reference_type=reference_type,
                reference_id=reference_id,
                created_by=request.user.username if request.user.is_authenticated else "",
            )

            logger.info(
                "Stock reserved | product=%s warehouse=%s quantity=%d",
                product_id,
                warehouse_id,
                quantity,
            )

        return Response(StockSerializer(stock).data)

    @action(detail=False, methods=["post"])
    def release(self, request):
        serializer = ReserveStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        warehouse_id = serializer.validated_data["warehouse_id"]
        quantity = serializer.validated_data["quantity"]
        reference_type = serializer.validated_data.get("reference_type", "order")
        reference_id = serializer.validated_data.get("reference_id", "")

        with transaction.atomic():
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )

            if stock.reserved < quantity:
                return Response(
                    {
                        "error": "Cannot release more than reserved",
                        "reserved": stock.reserved,
                        "requested": quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            Stock.objects.filter(
                product_id=product_id, warehouse_id=warehouse_id
            ).update(reserved=F("reserved") - quantity)
            stock.refresh_from_db()

            StockMovement.objects.create(
                product_id=product_id,
                from_warehouse_id=warehouse_id,
                quantity=quantity,
                type=StockMovement.RELEASE,
                reference_type=reference_type,
                reference_id=reference_id,
                created_by=request.user.username if request.user.is_authenticated else "",
            )

            logger.info(
                "Stock released | product=%s warehouse=%s quantity=%d",
                product_id,
                warehouse_id,
                quantity,
            )

        return Response(StockSerializer(stock).data)

    @action(detail=False, methods=["post"])
    def deduct(self, request):
        serializer = DeductStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        warehouse_id = serializer.validated_data["warehouse_id"]
        quantity = serializer.validated_data["quantity"]
        reference_type = serializer.validated_data.get("reference_type", "order")
        reference_id = serializer.validated_data.get("reference_id", "")

        with transaction.atomic():
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )

            available = stock.quantity - stock.reserved
            if available < quantity:
                return Response(
                    {
                        "error": "Insufficient available stock",
                        "available": available,
                        "requested": quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            Stock.objects.filter(
                product_id=product_id, warehouse_id=warehouse_id
            ).update(
                quantity=F("quantity") - quantity,
                reserved=F("reserved") - min(stock.reserved, quantity),
            )
            stock.refresh_from_db()

            StockMovement.objects.create(
                product_id=product_id,
                from_warehouse_id=warehouse_id,
                quantity=quantity,
                type=StockMovement.DEDUCT,
                reference_type=reference_type,
                reference_id=reference_id,
                created_by=request.user.username if request.user.is_authenticated else "",
            )

            logger.info(
                "Stock deducted | product=%s warehouse=%s quantity=%d",
                product_id,
                warehouse_id,
                quantity,
            )

            def publish_stock_changed():
                current = Stock.objects.get(
                    product_id=product_id, warehouse_id=warehouse_id
                )
                publish_event(
                    "inventory.stock.changed",
                    {
                        "event_id": str(uuid4()),
                        "product_id": product_id,
                        "warehouse_id": warehouse_id,
                        "quantity": current.quantity,
                        "change": -quantity,
                    },
                )
                _check_and_publish_low_stock(
                    product_id, warehouse_id, current.quantity,
                    warehouse_name=stock.warehouse.name,
                )

            transaction.on_commit(publish_stock_changed)
        return Response(StockSerializer(stock).data)

    @action(detail=False, methods=["post"])
    def transfer(self, request):
        serializer = TransferStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        from_warehouse_id = serializer.validated_data["from_warehouse_id"]
        to_warehouse_id = serializer.validated_data["to_warehouse_id"]
        quantity = serializer.validated_data["quantity"]
        reference_type = serializer.validated_data.get("reference_type", "transfer")
        reference_id = serializer.validated_data.get("reference_id", "")
        notes = serializer.validated_data.get("notes", "")

        if from_warehouse_id == to_warehouse_id:
            return Response(
                {"error": "Source and destination warehouses must be different"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            source = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=from_warehouse_id
            )
            dest, _ = Stock.objects.get_or_create(
                product_id=product_id,
                warehouse_id=to_warehouse_id,
                defaults={"quantity": 0},
            )
            dest = Stock.objects.select_for_update().get(pk=dest.pk)

            available = source.quantity - source.reserved
            if available < quantity:
                return Response(
                    {
                        "error": "Insufficient available stock at source",
                        "available": available,
                        "requested": quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            Stock.objects.filter(
                product_id=product_id, warehouse_id=from_warehouse_id
            ).update(quantity=F("quantity") - quantity)
            Stock.objects.filter(
                product_id=product_id, warehouse_id=to_warehouse_id
            ).update(quantity=F("quantity") + quantity)

            source.refresh_from_db()
            dest.refresh_from_db()

            StockMovement.objects.create(
                product_id=product_id,
                from_warehouse_id=from_warehouse_id,
                to_warehouse_id=to_warehouse_id,
                quantity=quantity,
                type=StockMovement.TRANSFER,
                reference_type=reference_type,
                reference_id=reference_id,
                notes=notes,
                created_by=request.user.username if request.user.is_authenticated else "",
            )

            _check_and_publish_low_stock(
                product_id, from_warehouse_id, source.quantity,
                warehouse_name=source.warehouse.name,
            )

            logger.info(
                "Stock transfer | product=%s from=%s to=%s quantity=%d",
                product_id, from_warehouse_id, to_warehouse_id, quantity,
            )

        return Response({
            "source": StockSerializer(source).data,
            "destination": StockSerializer(dest).data,
        })

    @action(detail=False, methods=["post"])
    def adjust(self, request):
        serializer = AdjustStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        warehouse_id = serializer.validated_data["warehouse_id"]
        new_quantity = serializer.validated_data["new_quantity"]
        reason = serializer.validated_data.get("reason", "")

        with transaction.atomic():
            stock = Stock.objects.select_for_update().get(
                product_id=product_id, warehouse_id=warehouse_id
            )

            delta = new_quantity - stock.quantity

            Stock.objects.filter(
                product_id=product_id, warehouse_id=warehouse_id
            ).update(quantity=F("quantity") + delta)
            stock.refresh_from_db()

            StockMovement.objects.create(
                product_id=product_id,
                to_warehouse_id=warehouse_id,
                quantity=abs(delta),
                type=StockMovement.ADJUSTMENT,
                reference_type="adjustment",
                notes=f"{reason} (delta: {delta:+d})" if reason else f"Delta: {delta:+d}",
                created_by=request.user.username if request.user.is_authenticated else "",
            )

            logger.info(
                "Stock adjusted | product=%s warehouse=%s delta=%+d new=%d",
                product_id, warehouse_id, delta, new_quantity,
            )

            transaction.on_commit(
                lambda: _check_and_publish_low_stock(
                    product_id, warehouse_id, stock.quantity,
                    warehouse_name=stock.warehouse.name,
                )
            )

        return Response(StockSerializer(stock).data)

    @action(detail=True, methods=["get"])
    def movements(self, request, pk=None):
        stock = self.get_object()
        movements = StockMovement.objects.filter(
            product_id=stock.product_id,
        ).select_related("from_warehouse", "to_warehouse")[:100]
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related(
        "from_warehouse", "to_warehouse"
    ).all()
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = StockMovementFilter
    ordering_fields = ["created_at", "product_id"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [IsAuthenticatedOrReadOnly()]


class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceiptNote.objects.select_related(
        "supplier", "warehouse"
    ).prefetch_related("items").all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["supplier", "warehouse"]
    search_fields = ["reference_number", "notes"]
    ordering_fields = ["created_at", "receipt_date"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return GoodsReceiptNoteCreateSerializer
        return GoodsReceiptNoteSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ("create", "update", "partial_update"):
            return [IsAdminOrWarehouseWorker()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()

        for item in instance.items.all():
            stock, _ = Stock.objects.get_or_create(
                product_id=item.product_id,
                warehouse=instance.warehouse,
                defaults={"quantity": 0},
            )
            Stock.objects.filter(
                product_id=item.product_id, warehouse=instance.warehouse
            ).update(quantity=F("quantity") + item.quantity)
            stock.refresh_from_db()

            StockMovement.objects.create(
                product_id=item.product_id,
                to_warehouse=instance.warehouse,
                quantity=item.quantity,
                type=StockMovement.RECEIPT,
                reference_type="goods_receipt",
                reference_id=str(instance.pk),
                notes=f"GRN #{instance.pk}: {item.quantity} units @ {item.cost_price}",
                created_by=instance.created_by,
            )

            logger.info(
                "Stock receipt | product=%s warehouse=%s quantity=%d cost=%s",
                item.product_id,
                instance.warehouse.name,
                item.quantity,
                item.cost_price,
            )

        for item in instance.items.all():
            transaction.on_commit(
                lambda item=item: publish_event(
                    "inventory.stock.changed",
                    {
                        "event_id": str(uuid4()),
                        "product_id": item.product_id,
                        "warehouse_id": instance.warehouse_id,
                        "quantity": Stock.objects.get(
                            product_id=item.product_id, warehouse=instance.warehouse
                        ).quantity,
                        "change": item.quantity,
                    },
                )
            )
            transaction.on_commit(
                lambda item=item: publish_event(
                    "inventory.goods_received",
                    {
                        "event_id": str(uuid4()),
                        "product_id": item.product_id,
                        "warehouse_id": instance.warehouse_id,
                        "quantity": item.quantity,
                        "cost_price": str(item.cost_price),
                        "grn_id": instance.pk,
                    },
                )
            )
        logger.info("GRN created | id=%s supplier=%s", instance.pk, instance.supplier.name)
