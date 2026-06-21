import logging

import requests
from django.conf import settings
from rest_framework.serializers import ValidationError

logger = logging.getLogger(__name__)


def validate_product_exists(product_id: int) -> None:
    """Validate product exists via Product Service. Raises ValidationError on 404."""
    product_service_url = settings.PRODUCT_SERVICE_URL
    url = f"{product_service_url}/api/products/{product_id}/"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 404:
            raise ValidationError(f"Product with id {product_id} does not exist")
        response.raise_for_status()
    except requests.ConnectionError:
        logger.warning(
            "Product Service unreachable, skipping validation for product %s", product_id
        )
    except requests.Timeout:
        logger.warning(
            "Product Service timed out, skipping validation for product %s", product_id
        )
    except requests.RequestException as e:
        logger.warning(
            "Product Service HTTP error, skipping validation for product %s: %s",
            product_id, e,
        )
