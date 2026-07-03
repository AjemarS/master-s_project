"""
Views — re-exported from API layer for backwards compatibility.
All view logic now lives in orders.api.views.
"""
from orders.api.views import OrderViewSet  # noqa: F401
from orders.core.order_service import (  # noqa: F401
    generate_order_number,
    calculate_total,
)
