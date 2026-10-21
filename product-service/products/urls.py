from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .reviews_views import ProductReviewsView, ReviewModerationView
from .views import CategoryViewSet, ProductViewSet, health_check

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"categories", CategoryViewSet, basename="category")

urlpatterns = (
    [
        path("products/<int:product_id>/reviews/", ProductReviewsView.as_view(), name="product-reviews"),
        path("reviews/<int:pk>/", ReviewModerationView.as_view(), name="review-moderation"),
        path("", include(router.urls)),
        path("health/", health_check, name="health-check"),
    ]

)
