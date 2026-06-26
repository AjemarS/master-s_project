from rest_framework.permissions import BasePermission


class IsAdminOrWarehouseWorker(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        role = getattr(request.user, "gateway_role", "user")
        return role in ("admin", "warehouse_worker")


class IsAdminOrCashier(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        role = getattr(request.user, "gateway_role", None) or request.headers.get(
            "X-Gateway-User-Role", "user"
        )
        return role in ("admin", "cashier")
