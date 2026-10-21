from django.conf import settings
from django.contrib import admin
from shared_metrics import metrics_view
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("metrics", metrics_view, name="metrics"),
    path("admin/", admin.site.urls),
    path("api/", include("products.urls")),
    path("api/", include("products.cart_urls")),
    # OpenAPI schema endpoints
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # static() serves nothing when DEBUG=False;
    # the gateway proxies /media here and browsers cache it 30 days
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
