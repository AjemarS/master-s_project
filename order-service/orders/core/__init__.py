"""Core domain layer — business logic services and event builders."""
from .event_builder import build_order_event  # noqa: F401
from .order_service import (  # noqa: F401
    create_order,
    update_order_status,
    release_order_stock,
    deduct_order_stock,
    reserve_order_stock,
    generate_order_number,
    calculate_total,
)
