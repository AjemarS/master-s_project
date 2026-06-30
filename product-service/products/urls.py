from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, health_check

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"categories", CategoryViewSet, basename="category")

urlpatterns = (
    [
        path("", include(router.urls)),
        path("health/", health_check, name="health-check"),
    ]

)
