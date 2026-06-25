from rest_framework.permissions import BasePermission


class IsAdminOrCashier(BasePermission):
    """Allows access to admin users (is_staff) or users with gateway_role='cashier'."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        role = getattr(request.user, "gateway_role", None) or request.headers.get(
            "X-Gateway-User-Role", "user"
        )
        return role in ("admin", "cashier")
