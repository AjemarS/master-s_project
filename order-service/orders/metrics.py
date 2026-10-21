"""Business counters next to the HTTP ones from shared_metrics; incremented only after the commit."""
from prometheus_client import Counter

ORDERS_CREATED = Counter("techhub_orders_created_total", "Orders placed", ["channel"])
ORDERS_CANCELLED = Counter("techhub_orders_cancelled_total", "Orders cancelled", ["channel"])
PAYMENTS = Counter("techhub_payments_total", "Stripe checkout outcomes", ["result"])
RETURNS_CREATED = Counter("techhub_returns_created_total", "Return and warranty claims filed", ["kind"])
