from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from .filters import ProductFilter


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProductFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "stock", "created_at", "updated_at"]
    ordering = ["-created_at"]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        threshold = int(request.query_params.get("threshold", 10))
        products = self.queryset.filter(stock__lte=threshold, inStock=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_category(self, request):
        category_id = request.query_params.get("category_id")
        if not category_id:
            return Response(
                {"error": "category_id параметр обов'язковий"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        products = self.queryset.filter(category_id=category_id, inStock=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def update_stock(self, request, pk=None):
        product = self.get_object()
        quantity = request.data.get("quantity")

        if quantity is None:
            return Response(
                {"error": "quantity параметр обов'язковий"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(quantity)
            new_stock = product.stock + quantity
            if new_stock < 0:
                return Response(
                    {"error": "Недостатньо товару на складі"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            product.stock = new_stock
            product.save()
            serializer = self.get_serializer(product)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {"error": "quantity повинен бути числом"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
