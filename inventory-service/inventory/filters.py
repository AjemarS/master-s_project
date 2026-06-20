from django_filters import rest_framework as filters

from .models import Stock, StockMovement


class StockFilter(filters.FilterSet):
    warehouse_id = filters.NumberFilter(field_name="warehouse__id")
    product_id = filters.NumberFilter()
    min_quantity = filters.NumberFilter(field_name="quantity", lookup_expr="gte")
    max_quantity = filters.NumberFilter(field_name="quantity", lookup_expr="lte")

    class Meta:
        model = Stock
        fields = ["warehouse_id", "product_id"]


class StockMovementFilter(filters.FilterSet):
    product_id = filters.NumberFilter()
    type = filters.CharFilter(lookup_expr="exact")
    from_warehouse_id = filters.NumberFilter(field_name="from_warehouse__id")
    to_warehouse_id = filters.NumberFilter(field_name="to_warehouse__id")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = StockMovement
        fields = ["product_id", "type"]
