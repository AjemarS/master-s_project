<<<<<<< Updated upstream
=======
"""URL configuration for orders API and report endpoints."""
>>>>>>> Stashed changes
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
<<<<<<< Updated upstream
=======
    path("", include("orders.report_urls")),
>>>>>>> Stashed changes
]
