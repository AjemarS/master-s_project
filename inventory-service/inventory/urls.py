from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GoodsReceiptNoteViewSet,
    StockMovementViewSet,
    StockViewSet,
    SupplierViewSet,
    WarehouseViewSet,
)

router = DefaultRouter()
router.register(r"warehouses", WarehouseViewSet, basename="warehouse")
router.register(r"stock", StockViewSet, basename="stock")
router.register(r"stock/movements", StockMovementViewSet, basename="stock-movement")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"goods-receipts", GoodsReceiptNoteViewSet, basename="goods-receipt")

urlpatterns = [
    path("", include(router.urls)),
]
