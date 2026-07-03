"""Main URL configuration — delegates to api/ and legacy report urls."""
from django.urls import include, path

urlpatterns = [
    path("", include("orders.api.urls")),
    path("", include("orders.report_urls")),
]
