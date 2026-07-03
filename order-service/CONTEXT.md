# Order Service

## Stack
- **Runtime:** Python 3.11 (Alpine in Docker)
- **Framework:** Django 5.2 + DRF 3.16
- **Database:** PostgreSQL 15 (`orders_db`, port 5435)
- **Auth:** `GatewayAuthentication` — reads `X-Gateway-User-*` headers, syncs local Django User
- **Message Broker:** RabbitMQ (publisher)
- **Payments:** Stripe webhook integration
- **Docs:** drf-spectacular (Swagger, ReDoc)

## Port
- Container: 8002 (default)
- Docker compose: maps to 8002:8002

## Architecture
```
orders/
├── api/              # HTTP layer (views, urls)
│   ├── views.py      # Thin DRF viewsets — validate input, delegate to core, format responses
│   └── urls.py       # API route definitions
├── core/             # Domain layer (business logic)
│   ├── order_service.py   # Order creation, status transitions, inventory sagas
│   └── event_builder.py   # RabbitMQ event payload construction
├── infrastructure/   # External integrations
│   └── inventory_client.py  # Inventory service HTTP client with circuit breaker
├── models.py         # Django ORM models (Order, OrderItem, OrderSagaState)
├── serializers.py    # DRF serializers (input validation, output formatting)
├── reports.py        # Report views (sales, revenue, daily sales, inventory value)
├── eventbus.py       # RabbitMQ event publisher (wraps shared-lib)
├── tests.py          # Test suite
├── urls.py           # Top-level URL config (routes to api/ and reports)
└── views.py          # Legacy re-exports from api.views
```

## Quick Start
```bash
python manage.py runserver 0.0.0.0:8002
python manage.py test
```

## Models
- **Order** — core entity with `order_number` (unique), `channel`, `status`, `delivery_method`, customer data, `total_amount`, `payment_status`, Stripe fields, `created_by`
- **OrderItem** — order line: product, quantity, price_at_sale, cost_price_at_sale
- **OrderSagaState** — distributed transaction tracking (reserve → deduct → release steps with error capture)

### Status Machine
```
unpaid → paid → delivering → delivered → completed
  ↓       ↓         ↓                    ↓
cancelled cancelled cancelled          cancelled
```
- Transitions enforced via `can_transition_to()` in the model

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders/` | Authenticated | Order list (filter: `?status=&channel=`) |
| POST | `/api/orders/` | Any | Create order (online checkout) |
| GET | `/api/orders/{id}/` | Owner/Admin | Order detail with items |
| PATCH | `/api/orders/{id}/status/` | Admin | Update status (with inventory side effects) |
| GET | `/api/orders/my/` | Authenticated | Current user's orders |
| POST | `/api/orders/pos/` | Cashier/Admin | POS sale (offline, immediate deduct) |
| POST | `/api/orders/{id}/pay/` | Authenticated | Create Stripe checkout session |
| POST | `/api/orders/stripe_webhook/` | No auth | Stripe payment webhook |
| GET | `/api/orders/health/` | Any | Health check |
| GET | `/api/reports/sales/` | Admin | Sales report (filterable by date) |
| GET | `/api/reports/revenue/` | Admin | Revenue & margin report |
| GET | `/api/reports/inventory-value/` | Admin | Inventory valuation |
| GET | `/api/reports/daily-sales/` | Admin | Last 30 days daily aggregation |

## Saga Integration (Order ↔ Inventory)

### Sync HTTP Flow
1. **Create order** → `_reserve_stock()` (async via consumer or HTTP in webhook)
2. **Pay** → Stripe webhook → `reserve_order_stock()` with partial-failure compensation
3. **Ship** → `deduct_order_stock()` (converts reserve → deduction, reverts on failure)
4. **Cancel** → `release_order_stock()` (releases reserved stock)

### Improvements (July 2026)
| # | Improvement | Layer |
|---|-------------|-------|
| 1 | Atomic order + items in single `transaction.atomic()` with `bulk_create` | core/order_service.py |
| 2 | Dedicated `inventory_client.py` — centralized HTTP calls with structured error handling | infrastructure/ |
| 3 | `OrderSagaState` model for distributed transaction observability | models.py |
| 4 | `check_availability()` function for pre-order stock validation | infrastructure/ |
| 5 | DB-level report aggregation (no Python `sum()` loops) | reports.py |
| 6 | Health endpoint at `GET /api/orders/health/` | api/views.py |
| 7 | Saga compensation — partial reserve failures trigger release of succeeded items | core/order_service.py |
| 8 | Layered architecture — `api/` (thin) → `core/` (business logic) → `infrastructure/` | refactor |
| 9 | Additional DB indexes (`created_at`, `warehouse_id`) | models.py |
| 10 | Order detail requires authentication (was public) | api/views.py |

## Tests
- **Framework:** Django `TestCase` + `APITestCase`
- **Run:** `python manage.py test`
