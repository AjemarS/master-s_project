from django_filters import rest_framework as filters

from .models import Product


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    min_stock = filters.NumberFilter(field_name="stock", lookup_expr="gte")
    max_stock = filters.NumberFilter(field_name="stock", lookup_expr="lte")
    category = filters.NumberFilter(field_name="category__id")
    in_stock = filters.BooleanFilter(field_name="in_stock")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ["name", "category", "in_stock"]
