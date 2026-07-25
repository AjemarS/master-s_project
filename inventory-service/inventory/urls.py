from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityEventViewSet,
    GoodsReceiptNoteViewSet,
    StockMovementViewSet,
    StockViewSet,
    SupplierViewSet,
    WarehouseViewSet,
    health_check,
)

router = DefaultRouter()
router.register(r"warehouses", WarehouseViewSet, basename="warehouse")
router.register(r"stock/movements", StockMovementViewSet, basename="stock-movement")
router.register(r"stock", StockViewSet, basename="stock")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"goods-receipts", GoodsReceiptNoteViewSet, basename="goods-receipt")
router.register(r"activity/events", ActivityEventViewSet, basename="activity-event")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", health_check, name="health-check"),
]
