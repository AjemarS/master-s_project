from django.db.models import Q
from django_filters import rest_framework as filters

from .models import Product


class NumberInFilter(filters.BaseInFilter, filters.NumberFilter):
    pass


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    min_stock = filters.NumberFilter(field_name="stock", lookup_expr="gte")
    max_stock = filters.NumberFilter(field_name="stock", lookup_expr="lte")
    # A category also lists its subcategories' products (shortcut: one level, like product_count)
    category = filters.NumberFilter(method="filter_category")
    in_stock = filters.BooleanFilter(field_name="in_stock")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    min_rating = filters.NumberFilter(field_name="rating", lookup_expr="gte")
    on_sale = filters.BooleanFilter(field_name="is_on_sale")
    brand = filters.CharFilter(lookup_expr="icontains")
    color = filters.CharFilter(lookup_expr="icontains")
    id = filters.NumberFilter(field_name="id")
    ids = NumberInFilter(field_name="id")  # ?ids=1,2,3: one request instead of one per product

    def filter_category(self, queryset, name, value):
        return queryset.filter(Q(category_id=value) | Q(category__parent_id=value))

    class Meta:
        model = Product
        fields = ["name", "category", "in_stock", "brand", "color"]
