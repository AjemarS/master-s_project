"""
Product service HTTP client: the catalog is the only source of truth for what an item costs.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class CatalogUnavailable(Exception):
    """product-service could not be reached or answered with an error."""


def get_catalog_items(product_ids):
    """
    {product_id: {"price": Decimal-able str, "name": str}} for the products that exist.
    Unknown ids are left out; any transport or 5xx error raises CatalogUnavailable.
    """
    # shortcut: one GET per distinct product; an order has a handful, switch to ?ids= once product-service on main has it
    found = {}
    for pid in sorted(set(product_ids)):
        try:
            resp = requests.get(f"{settings.PRODUCT_SERVICE_URL}/api/products/{pid}/", timeout=5)
        except requests.RequestException as e:
            logger.error("get_catalog_items: product-service unreachable: %s", e)
            raise CatalogUnavailable(str(e)) from e
        if resp.status_code == 404:
            continue
        if resp.status_code != 200:
            logger.error("get_catalog_items: product %s returned HTTP %s", pid, resp.status_code)
            raise CatalogUnavailable(f"HTTP {resp.status_code}")
        body = resp.json()
        found[pid] = {"price": str(body["price"]), "name": body.get("name", "")}
    return found
