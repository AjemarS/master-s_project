from rest_framework.permissions import BasePermission


class IsAdminOrWarehouseWorker(BasePermission):
    """Allow admin (is_staff or gateway_role=admin) or warehouse_worker."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Django admin/superuser always pass (includes test setup)
        if request.user.is_staff or request.user.is_superuser:
            return True
        role = getattr(request.user, "gateway_role", "user")
        return role in ("admin", "warehouse_worker")
