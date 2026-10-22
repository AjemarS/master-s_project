"""Product reviews: public reading, buyers-only writing, admin moderation."""
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Review
from .order_client import OrdersUnavailableError, has_purchased
from .pagination import StandardResultsSetPagination


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "author_name", "rating", "text", "is_published", "created_at", "updated_at"]
        read_only_fields = ["id", "author_name", "is_published", "created_at", "updated_at"]


class OrderServiceUnavailable(APIException):
    status_code = 503
    default_detail = "Cannot verify the purchase right now, try again later."


def _public_name(request):
    """First word of the display name; nothing if it is an email (sign-up may use the email)."""
    name = (request.META.get("HTTP_X_GATEWAY_USER_NAME") or request.user.first_name or "").strip()
    first = name.split()[0] if name else ""
    return "" if "@" in first else first[:60]


class ProductReviewsView(APIView):
    """GET /api/products/{id}/reviews/ and POST (create or replace your own review)."""

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        published = product.reviews.filter(is_published=True)
        distribution = dict(
            published.values("rating").annotate(n=Count("id")).values_list("rating", "n")
        )

        # Admins see hidden reviews too, so they can publish them back
        listed = product.reviews.all() if request.user.is_staff else published
        paginator = StandardResultsSetPagination()
        page: list[Review] | None = paginator.paginate_queryset(listed, request, view=self)
        body = paginator.get_paginated_response(ReviewSerializer(page, many=True).data).data

        body["summary"] = {
            "average": float(product.rating),
            "count": product.review_count,
            "distribution": {str(stars): distribution.get(stars, 0) for stars in range(5, 0, -1)},
        }
        if request.user.is_authenticated:
            mine = product.reviews.filter(user_id=request.user.username).first()
            body["mine"] = ReviewSerializer(mine).data if mine else None
            try:
                body["can_review"] = has_purchased(request, product.pk)
            except OrdersUnavailableError:
                body["can_review"] = None  # unknown: the page hides the form rather than failing
        return Response(body)

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        data = ReviewSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            bought = has_purchased(request, product.pk)
        except OrdersUnavailableError:
            raise OrderServiceUnavailable() from None
        if not bought:
            return Response(
                {"error": "Only buyers who received this product can review it."},
                status=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            review, created = Review.objects.update_or_create(
                product=product,
                user_id=request.user.username,
                defaults={
                    "rating": data.validated_data["rating"],
                    "text": data.validated_data.get("text", ""),
                    "author_name": _public_name(request),
                },
            )
            Review.refresh_product_rating(product.pk)
        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ReviewModerationView(APIView):
    """PATCH /api/reviews/{id}/ {"is_published": bool}: hide or restore a review (admin)."""

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        published = request.data.get("is_published")
        if not isinstance(published, bool):
            return Response(
                {"is_published": "Expected true or false"}, status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            review.is_published = published
            review.save(update_fields=["is_published", "updated_at"])
            Review.refresh_product_rating(review.product_id)
        return Response(ReviewSerializer(review).data)
