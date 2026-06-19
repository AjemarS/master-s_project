import logging

from django.db import transaction
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import ProductFilter
from .models import Category, Product
from .pagination import StandardResultsSetPagination
from .serializers import CategorySerializer, ProductSerializer

logger = logging.getLogger(__name__)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.

    list/retrieve: open (read-only)
    create/update/destroy: requires authentication + admin role
    update_stock: requires authentication + admin role
    """

    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProductFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "stock", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        """
        Read-only actions are open; mutating actions require admin auth.
        """
        if self.action in ("list", "retrieve", "low_stock", "by_category"):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info(
            "Product created | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(
            "Product updated | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )

    def perform_destroy(self, instance):
        logger.warning(
            "Product deleted | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )
        instance.delete()

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """Return products whose stock is at or below the given threshold."""
        raw = request.query_params.get("threshold", "10")
        try:
            threshold = int(raw)
        except (TypeError, ValueError) as e:
            raise ValidationError({"threshold": "Must be a non-negative integer."}) from e
        if threshold < 0:
            raise ValidationError({"threshold": "Must be a non-negative integer."})

        products = self.filter_queryset(
            self.queryset.filter(stock__lte=threshold, in_stock=True)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_category(self, request):
        """Return in-stock products for the given category_id."""
        category_id = request.query_params.get("category_id")
        if not category_id:
            raise ValidationError({"category_id": "This parameter is required."})

        try:
            category_id = int(category_id)
        except (TypeError, ValueError) as e:
            raise ValidationError({"category_id": "Must be a positive integer."}) from e
        if category_id <= 0:
            raise ValidationError({"category_id": "Must be a positive integer."})

        # Verify the category actually exists
        if not Category.objects.filter(pk=category_id).exists():
            return Response(
                {"error": "Category not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        products = self.filter_queryset(
            self.queryset.filter(category_id=category_id, in_stock=True)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def update_stock(self, request, pk=None):
        """
        Atomically adjust product stock by `quantity` (positive = restock,
        negative = deduct). Uses database-level F() expression + select_for_update
        to eliminate the read-modify-write race condition.
        """
        product = self.get_object()
        raw_quantity = request.data.get("quantity")

        if raw_quantity is None:
            raise ValidationError({"quantity": "This field is required."})

        try:
            quantity = int(raw_quantity)
        except (TypeError, ValueError) as e:
            raise ValidationError({"quantity": "Must be an integer."}) from e

        with transaction.atomic():
            # Lock the row for the duration of this transaction
            product = Product.objects.select_for_update().get(pk=product.pk)

            new_stock = product.stock + quantity
            if new_stock < 0:
                return Response(
                    {"error": "Insufficient stock."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Use F() for the atomic DB-level update (race-condition safe)
            Product.objects.filter(pk=product.pk).update(
                stock=F("stock") + quantity
            )
            product.refresh_from_db()

            logger.info(
                "Stock updated | id=%s delta=%+d new_stock=%d user=%s",
                product.pk,
                quantity,
                product.stock,
                request.user,
            )

        serializer = self.get_serializer(product)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category CRUD operations.

    list/retrieve: open (read-only)
    create/update/destroy: requires authentication + admin role
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info(
            "Category created | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(
            "Category updated | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )

    def perform_destroy(self, instance):
        logger.warning(
            "Category deleted | id=%s name=%r user=%s",
            instance.pk,
            instance.name,
            self.request.user,
        )
        instance.delete()
