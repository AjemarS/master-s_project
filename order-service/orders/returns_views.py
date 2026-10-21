"""API for returns and warranty claims: customers file and follow their own, admins process all."""
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from orders import returns as svc
from orders.models import OrderItem, ReturnRequest
from orders.serializers import ReturnCreateSerializer, ReturnRequestSerializer, ReturnStatusSerializer


class ReturnRequestViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReturnRequestSerializer
    filterset_fields = ["status", "kind", "order"]

    def get_permissions(self):
        if self.action == "set_status":
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ReturnRequest.objects.select_related("order", "item")
        user = self.request.user
        # Same ownership rule as orders: created_by holds the buyer's username
        return qs if user.is_staff else qs.filter(order__created_by=user.username)

    def create(self, request):
        data = ReturnCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        items = OrderItem.objects.select_related("order")
        if not request.user.is_staff:
            items = items.filter(order__created_by=request.user.username)
        # 404 rather than 403 for someone else's line: do not reveal that it exists
        item = get_object_or_404(items, pk=data.validated_data["item_id"])
        ret = svc.create_return(
            item,
            kind=data.validated_data["kind"],
            quantity=data.validated_data["quantity"],
            reason=data.validated_data["reason"],
            created_by=request.user.username,
        )
        return Response(ReturnRequestSerializer(ret).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        ret = self.get_object()
        data = ReturnStatusSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        error, code = svc.transition(
            ret,
            data.validated_data["status"],
            resolution=data.validated_data["resolution"],
            restock=data.validated_data["restock"],
            comment=data.validated_data["comment"],
            request=request,
        )
        if error:
            return Response(error, status=code)
        return Response(ReturnRequestSerializer(ret).data)
