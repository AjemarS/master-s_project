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

## Quick Start
```bash
python manage.py runserver 0.0.0.0:8002
python manage.py test
```

## Apps

### `orders/`

#### Models
- **Order** — core entity. Fields: `order_number` (timestamp + random suffix), `channel` (`online`/`offline`), `status` (see state machine), customer data (`customer_name`, `customer_email`, `customer_phone`, `customer_address`), `total_amount`, `created_by`, `notes`.
- **OrderItem** — order line: product, quantity, price_at_sale, cost_price_at_sale (for margin calculation).

### Status Machine
```
unpaid → paid → delivering → delivered → completed
  ↓       ↓        ↓             ↓
cancelled cancelled cancelled  cancelled
```
- `unpaid`: initial state (created, not paid yet)
- `paid`: payment confirmed (stock reserved via Stripe webhook)
- `delivering`: stock deducted, in transit
- `delivered`: received by customer
- `completed`: fully processed
- `cancelled`: from any state (triggers stock release via inventory_service.release_stock)

Transitions enforced in `Order.can_transition_to()`.

#### Viewsets
- `OrderViewSet` — CRUD, my orders (`@action`), POS sales (`@action`), status updates.
- `ReportViewSet` — sales report, revenue/margin report, inventory-value report.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders/` | Admin | Order list (filter: `?status=&channel=`) |
| POST | `/api/orders/` | Any auth | Create order (online checkout) |
| GET | `/api/orders/{id}/` | Any auth | Order detail |
| PATCH | `/api/orders/{id}/` | Admin | Update order status |
| GET | `/api/orders/my/` | Auth user | Current user's orders |
| POST | `/api/orders/pos/` | Cashier/Admin | POS sale (offline, immediate deduct) |
| GET | `/api/orders/payments/stripe-webhook/` | No auth | Stripe payment callback |
| GET | `/api/reports/sales/` | Admin | Sales report (filterable by date) |
| GET | `/api/reports/revenue/` | Admin | Revenue & margin report |
| GET | `/api/reports/inventory-value/` | Admin | Inventory valuation (queries actual stock via inventory-service + product-service APIs) |
| GET | `/api/docs/` | Any | Swagger UI |
| GET | `/api/redoc/` | Any | ReDoc |

## Saga Integration (Order ↔ Inventory)

### Synchronous HTTP Flow
1. **Create order:** order-service → `POST /api/inventory/stock/reserve/` (with `product_id`, `quantity`, `warehouse_id`)
2. **Ship order:** order-service → `POST /api/inventory/stock/deduct/` (converts reserve → deduction)
3. **Cancel order:** order-service → `POST /api/inventory/stock/release/` (releases reserved stock)

### Saga Integration (Reserve on Create)
- **Create order:** stock reserve with saga compensation on failure (rollback + cancel order)
- **Ship order:** stock deduct with partial-failure compensation (revert status + release)
- **Cancel order:** stock release via `release_stock` (best-effort, idempotency keys prevent double-release)
- **Idempotency keys:** all inventory client calls include `idempotency_key` for safe retry
- **Stock pre-check:** `check_availability` before order creation (returns 400 if insufficient)

## RabbitMQ Integration

### Publisher
- `order.created` — published after order creation (consumed by inventory-consumer, notification-service)
- `order.cancelled` — published on cancellation (consumed by inventory-consumer)
- `order.status_changed` — published on any status transition (consumed by notification-service)
- **Exchange:** `techhub.events` (topic)

## Reports
- **Sales report:** aggregated sales by date range, channel, status
- **Revenue & margin:** total revenue, cost of goods sold, margin percentage (uses `cost_price_at_sale` on OrderItem)
- **Inventory value:** queries actual stock via inventory-service + product-service APIs

## Auth & Permissions
- `GatewayAuthentication` — base class for all Django services
- `IsAdminUser` — for status changes, reports
- `IsAuthenticatedOrReadOnly` — for order creation (anonymous checkout allowed)
- `IsAuthenticated` on retrieve (filtered by created_by for non-staff)

## Tests
- **Framework:** Django `TestCase` + `APITestCase`
- **Coverage:** models, status transitions, API (create, auth gating, status update, my orders, POS, reports)
- **Known issue:** `EOFError` on test DB teardown (prompts for `autoclobber` input)
- **Run:** `python manage.py test`

## Known Issues
- No product validation (accepts any `product_id` without cross-referencing product-service)
- `order_number` retry loop handles collisions but no DB-level unique guarantee (column has `unique=True` for future enforcement)
- Test DB teardown prompts for `autoclobber` input (`EOFError`)
