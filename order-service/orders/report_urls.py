from django.urls import path

from . import reports

urlpatterns = [
    path("sales/", reports.sales_report, name="sales-report"),
    path("revenue/", reports.revenue_report, name="revenue-report"),
    path("inventory-value/", reports.inventory_value_report, name="inventory-value-report"),
]
