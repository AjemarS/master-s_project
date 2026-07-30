# TechHub Shared Library (`shared-lib`)

Python shared library for TechHub Django microservices. Provides authentication middleware, event bus utilities, and reusable test helpers — eliminating code duplication across product-service, inventory-service, and order-service.

---

## Contents

```
shared-lib/
├── setup.py                        # Package definition (pip-installable)
├── requirements-base.txt           # Core dependencies for all Django services
├── shared_auth/
│   ├── authentication.py           # GatewayAuthentication (DRF auth backend)
│   ├── permissions.py              # IsAdminOrWarehouseWorker, IsAdminOrCashier
│   ├── audit_middleware.py         # AuditMiddleware (fire-and-forget to audit-service)
│   ├── settings_base.py            # Shared DRF/spectacular/logging config dicts
│   └── test_helpers.py             # create_admin_user, create_cashier_user, etc.
└── shared_eventbus/
    ├── connection.py               # RabbitMQ connection pool (techhub.events)
    ├── publisher.py                # publish_event() helper
    └── consumer.py                 # start_consumer() + dedup helpers
```

---

## Installation

Services don't install this library via pip. Instead, each Docker Compose service includes it as a build context:

```yaml
# From docker-compose.yaml (product-service example):
build:
  context: .
  dockerfile: product-service/Dockerfile
```

And the Dockerfile copies it in:

```dockerfile
COPY shared-lib /shared-lib
RUN pip install -e /shared-lib
```

The `setup.py` declares dependencies shared across all Django services: Django, DRF, pika, requests.

---

## Usage

### GatewayAuthentication

```python
# In a Django service's settings.py:
INSTALLED_APPS = [
    ...
    "shared_auth",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "shared_auth.authentication.GatewayAuthentication",
    ],
    **shared_auth.settings_base.BASE_REST_FRAMEWORK,
}
```

`GatewayAuthentication` reads `X-Gateway-User-*` headers injected by the Nginx gateway, creates or syncs a local Django `User` record, and sets `gateway_role` on the user object. If no headers are present, it returns `None` (anonymous).

### Permissions

```python
from shared_auth.permissions import IsAdminOrWarehouseWorker, IsAdminOrCashier

class GoodsReceiptViewSet(ModelViewSet):
    permission_classes = [IsAdminOrWarehouseWorker]
```

- `IsAdminOrWarehouseWorker` — allows admin or warehouse_worker role
- `IsAdminOrCashier` — allows admin or cashier role

### Audit Middleware

```python
# settings.py:
MIDDLEWARE = [
    ...
    "shared_auth.audit_middleware.AuditMiddleware",
    ...
]
```

Captures every HTTP request and sends metadata (method, path, status, duration, user_id) to `audit-service:8005/api/audit/log` in a fire-and-forget background thread. Failures are silently dropped (network errors don't affect the request).

### Event Publishing

```python
from shared_eventbus.publisher import publish_event

publish_event("order.created", {
    "event_id": str(uuid.uuid4()),
    "order_id": order.id,
    "total_amount": str(order.total_amount),
})
```

Publishes to `techhub.events` topic exchange with `delivery_mode=2` (persistent) and the event ID as message ID.

### Event Consumption

```python
from shared_eventbus.consumer import start_consumer, dedup_check, dedup_claim

def handle_order_created(event, event_id):
    if dedup_check(event_id, ProcessedEvent):
        return
    # process event...
    dedup_claim(event_id, ProcessedEvent)

queue_map = {
    "order.created": handle_order_created,
    "order.cancelled": handle_order_cancelled,
}

start_consumer(queue_map, "inventory-consumer")
```

### Test Helpers

```python
from shared_auth.test_helpers import (
    create_admin_user,
    create_regular_user,
    create_cashier_user,
    create_warehouse_user,
)
```

Creates Django `User` instances with `gateway_role` set appropriately for integration tests.

### Shared Settings

```python
from shared_auth.settings_base import BASE_REST_FRAMEWORK, BASE_SPECTACULAR_SETTINGS

REST_FRAMEWORK = {**BASE_REST_FRAMEWORK, "PAGE_SIZE": 50}
SPECTACULAR_SETTINGS = {**BASE_SPECTACULAR_SETTINGS, "TITLE": "Product Service"}
```

Pre-configured DRF defaults: pagination (20/page), GatewayAuthentication, IsAuthenticatedOrReadOnly, throttling (60/min anon, 300/min user), DjangoFilterBackend, JSON-only rendering, drf-spectacular schema.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| Django >=5.0 | Web framework |
| djangorestframework >=3.15 | REST API framework |
| pika >=1.3 | RabbitMQ client |
| requests | HTTP client (audit middleware) |
| psycopg2-binary | PostgreSQL adapter (in requirements-base.txt) |
| django-filter | DRF filtering support |
| django-cors-headers | CORS support |
| python-decouple | Environment config |
| drf-spectacular | OpenAPI schema generation |

---

## Known Issues

- `GatewayAuthentication` only supports header-based auth — no fallback for direct API access (intentional: all external requests go through the gateway).
- `shared_eventbus.connection` uses a global singleton pattern — not suitable for multi-threaded consumer setups. Each consumer process should manage its own connection.
- `dedup_check` / `dedup_claim` requires a Django `ProcessedEvent` model with a unique `event_id` column in each consuming service.
