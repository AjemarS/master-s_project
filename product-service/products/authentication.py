"""
Custom DRF authentication for gateway-proxied requests.

The API Gateway authenticates users against Better Auth and forwards
the verified user info via trusted internal headers. This class
reads those headers and creates/retrieves a matching Django User,
so DRF permission classes (IsAdminUser, IsAuthenticatedOrReadOnly, etc.)
work correctly.
"""

import logging

from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

User = get_user_model()


class GatewayAuthentication(BaseAuthentication):
    """
    Authenticate based on trusted headers set by the API Gateway.

    The gateway sets these headers *only after* verifying a valid
    Better Auth session, so we can trust them implicitly.
    """

    # Header names the gateway uses to communicate with backends
    GATEWAY_USER_ID_HEADER = "HTTP_X_GATEWAY_USER_ID"
    GATEWAY_USER_ROLE_HEADER = "HTTP_X_GATEWAY_USER_ROLE"
    GATEWAY_USER_EMAIL_HEADER = "HTTP_X_GATEWAY_USER_EMAIL"
    GATEWAY_USER_NAME_HEADER = "HTTP_X_GATEWAY_USER_NAME"

    def authenticate(self, request):
        """
        Returns a (user, None) tuple if the gateway headers are present,
        otherwise None (DRF falls through to the next authenticator).
        """

        # Ensure this is a proxied request from the gateway
        user_id = request.META.get(self.GATEWAY_USER_ID_HEADER)
        if not user_id:
            # No gateway auth info → fall through to other auth classes
            return None

        role = request.META.get(self.GATEWAY_USER_ROLE_HEADER, "user")
        email = request.META.get(self.GATEWAY_USER_EMAIL_HEADER, f"{user_id}@gateway.local")
        name = request.META.get(self.GATEWAY_USER_NAME_HEADER, user_id)

        # Retrieve or create a Django user matching the Better Auth user ID
        # We prefix the username to avoid collisions
        username = f"gw_{user_id}"

        try:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": name[:30],
                    "is_staff": role == "admin",
                    "is_superuser": role == "admin",
                },
            )

            # Update role / email / name on every request in case they changed
            if not created:
                changed = False
                if user.email != email:
                    user.email = email
                    changed = True
                # Sync is_staff with gateway role
                expected_staff = role == "admin"
                if user.is_staff != expected_staff:
                    user.is_staff = expected_staff
                    user.is_superuser = expected_staff
                    changed = True
                if changed:
                    user.save()

            user.gateway_role = role

            logger.debug(
                "Gateway auth: user=%s role=%s created=%s", user_id, role, created
            )
            return (user, None)

        except Exception as exc:
            logger.error("Gateway auth error for user_id=%s: %s", user_id, exc)
            raise AuthenticationFailed("Authentication service error") from exc

    def authenticate_header(self, request):
        """Value for the WWW-Authenticate header when 401 is returned."""
        return 'Gateway realm="api"'
