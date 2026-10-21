"""URL configuration for orders API and report endpoints."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .delivery_api import nova_poshta_warehouses, ukrposhta_warehouses
from .returns_views import ReturnRequestViewSet
from .views import OrderViewSet

router = DefaultRouter()
# Before "orders": otherwise orders/{pk}/ would capture "returns" as an order id
router.register(r"orders/returns", ReturnRequestViewSet, basename="return")
router.register(r"orders", OrderViewSet, basename="order")

urlpatterns = [
    path("orders/delivery/nova-poshta-warehouses/", nova_poshta_warehouses, name="nova-poshta-warehouses"),
    path("orders/delivery/ukrposhta-warehouses/", ukrposhta_warehouses, name="ukrposhta-warehouses"),
    path("", include(router.urls)),
    path("", include("orders.report_urls")),
]
