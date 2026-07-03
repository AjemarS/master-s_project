"""Infrastructure layer — external service clients, persistence abstractions."""
from .inventory_client import reserve_stock, deduct_stock, release_stock, check_availability  # noqa: F401
