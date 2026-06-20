import logging

from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

User = get_user_model()


class GatewayAuthentication(BaseAuthentication):
    GATEWAY_USER_ID_HEADER = "HTTP_X_GATEWAY_USER_ID"
    GATEWAY_USER_ROLE_HEADER = "HTTP_X_GATEWAY_USER_ROLE"
    GATEWAY_USER_EMAIL_HEADER = "HTTP_X_GATEWAY_USER_EMAIL"
    GATEWAY_USER_NAME_HEADER = "HTTP_X_GATEWAY_USER_NAME"

    def authenticate(self, request):
        user_id = request.META.get(self.GATEWAY_USER_ID_HEADER)
        if not user_id:
            return None

        role = request.META.get(self.GATEWAY_USER_ROLE_HEADER, "user")
        email = request.META.get(
            self.GATEWAY_USER_EMAIL_HEADER, f"{user_id}@gateway.local"
        )
        name = request.META.get(self.GATEWAY_USER_NAME_HEADER, user_id)

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

            if not created:
                changed = False
                if user.email != email:
                    user.email = email
                    changed = True
                expected_staff = role == "admin"
                if user.is_staff != expected_staff:
                    user.is_staff = expected_staff
                    user.is_superuser = expected_staff
                    changed = True
                if changed:
                    user.save()

            logger.debug(
                "Gateway auth: user=%s role=%s created=%s", user_id, role, created
            )
            return (user, None)

        except Exception as exc:
            logger.error("Gateway auth error for user_id=%s: %s", user_id, exc)
            raise AuthenticationFailed("Authentication service error") from exc

    def authenticate_header(self, request):
        return 'Gateway realm="api"'
