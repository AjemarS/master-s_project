"""Promo codes API: admins manage codes, shoppers preview a code before placing the order."""
from decimal import Decimal, InvalidOperation

from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from orders import promo as svc
from orders.models import PromoCode


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = [
            "id", "code", "kind", "value", "min_order_amount", "starts_at", "ends_at",
            "max_uses", "once_per_customer", "used_count", "is_active", "created_at",
        ]
        read_only_fields = ["used_count", "created_at"]

    def validate_code(self, value):
        value = value.strip().upper()
        if not value.replace("-", "").replace("_", "").isalnum():
            raise serializers.ValidationError("Use letters, digits, - and _ only.")
        return value

    def validate(self, data):
        kind = data.get("kind", getattr(self.instance, "kind", None))
        value = data.get("value", getattr(self.instance, "value", None))
        if value is not None and value <= 0:
            raise serializers.ValidationError({"value": "Must be greater than 0."})
        if kind == PromoCode.PERCENT and value is not None and value > 100:
            raise serializers.ValidationError({"value": "A percentage cannot exceed 100."})
        starts, ends = data.get("starts_at"), data.get("ends_at")
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "Must be after the start."})
        return data


class PromoCodeViewSet(viewsets.ModelViewSet):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminUser]
    # Codes that were used stay for the order history: deactivate instead of deleting
    http_method_names = ["get", "post", "patch", "head", "options"]


class PromoCheckThrottle(SimpleRateThrottle):
    """Few guesses per minute per client, so codes cannot be found by trying them all."""

    scope = "promo_check"

    def get_rate(self):
        return "10/minute"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PromoCheckThrottle])
def promo_check(request):
    """GET ?code=&subtotal= -> the discount the code would give; the order recomputes it at creation."""
    code = request.query_params.get("code", "")
    try:
        subtotal = Decimal(request.query_params.get("subtotal", "0"))
    except InvalidOperation:
        return Response({"subtotal": "Expected a number"}, status=400)
    if not code.strip() or subtotal < 0:
        return Response({"code": "A code and a non-negative subtotal are required"}, status=400)
    created_by = request.user.username if request.user.is_authenticated else ""
    promo, discount = svc.evaluate(code, subtotal, created_by=created_by)
    return Response({
        "code": promo.code,
        "kind": promo.kind,
        "value": str(promo.value),
        "discount": str(discount),
        "total": str(subtotal - discount),
    })
