"""Order service HTTP client: whether a user has received a product, which gates writing a review."""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Forwarded so order-service authenticates the same user the gateway authenticated
_GATEWAY_HEADERS = {
    "HTTP_X_GATEWAY_USER_ID": "X-Gateway-User-Id",
    "HTTP_X_GATEWAY_USER_ROLE": "X-Gateway-User-Role",
    "HTTP_X_GATEWAY_USER_EMAIL": "X-Gateway-User-Email",
    "HTTP_X_GATEWAY_USER_NAME": "X-Gateway-User-Name",
}


class OrdersUnavailable(Exception):
    pass


def has_purchased(request, product_id):
    headers = {name: request.META[key] for key, name in _GATEWAY_HEADERS.items() if key in request.META}
    try:
        resp = requests.get(
            f"{settings.ORDER_SERVICE_URL}/api/orders/purchased/",
            params={"product_id": product_id}, headers=headers, timeout=5,
        )
        resp.raise_for_status()
        return bool(resp.json().get("purchased"))
    except (requests.RequestException, ValueError) as e:
        logger.error("has_purchased: order-service error: %s", e)
        raise OrdersUnavailable(str(e)) from e
