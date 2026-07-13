# Inventory Service

## Stack
- **Runtime:** Python 3.11 (Alpine in Docker)
- **Framework:** Django 5.2 + DRF 3.16
- **Database:** PostgreSQL 15 (`inventory_db`, port 5434)
- **Auth:** `GatewayAuthentication` — reads `X-Gateway-User-*` headers, syncs local Django User
- **Message Broker:** RabbitMQ (publishes + consumes via `inventory-consumer` container)
- **Docs:** drf-spectacular (Swagger, ReDoc)

## Port
- Container: 8001 (default)
- Docker compose: maps to 8001:8001

## Quick Start
```bash
python manage.py runserver 0.0.0.0:8001
python manage.py test
```

## Apps

### `inventory/`

#### Models
- **Warehouse** — storage location. Fields: `name`, `type` (`warehouse`/`showroom`), `address`, `active` toggle.
- **Stock** — stock level per product per warehouse. Unique constraint: `(product_id, warehouse_id)`. Atomic operations via `select_for_update`.
- **StockMovement** — audit log. Types: `receipt`, `transfer`, `sale`, `adjustment`, `write_off`, `reserve`, `release`, `deduct`. Tracks product, warehouse, quantity change, reference, user, timestamp.
- **Supplier** — vendor info: name, contact person, phone, email, address.
- **GoodsReceiptNote** — GRN header: supplier, date, notes, author.
- **GoodsReceiptItem** — GRN line: product, quantity, cost_price. On create: auto-increments `Stock.qty` and recalculates weighted-average cost.

#### Viewsets
- `WarehouseViewSet` — CRUD
- `StockViewSet` — list/filter by warehouse and product. Custom `@action` endpoints: `reserve`, `deduct`, `release` (business-critical, atomic).
- `StockMovementViewSet` — list/filter (audit log)
- `SupplierViewSet` — CRUD
- `GoodsReceiptNoteViewSet` — CRUD (create auto-adds stock)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/inventory/warehouses/` | Any | Warehouse list |
| POST | `/api/inventory/warehouses/` | Admin | Create warehouse |
| GET | `/api/inventory/warehouses/{id}/` | Any | Warehouse detail |
| PUT | `/api/inventory/warehouses/{id}/` | Admin | Update warehouse |
| GET | `/api/inventory/warehouses/{id}/stock/` | Any | Stock by warehouse |
| GET | `/api/inventory/stock/` | Any | Stock query (`?warehouse_id=&product_id=`) |
| POST | `/api/inventory/stock/reserve/` | Internal | Reserve stock (called by order-service) |
| POST | `/api/inventory/stock/deduct/` | Internal | Deduct stock (called by order-service) |
| POST | `/api/inventory/stock/release/` | Internal | Release reserved stock |
| GET | `/api/inventory/stock/movements/` | Any | Stock movement audit log |
| GET | `/api/inventory/suppliers/` | Any | Supplier list |
| POST | `/api/inventory/suppliers/` | Admin | Create supplier |
| GET | `/api/inventory/goods-receipts/` | Any | GRN list |
| POST | `/api/inventory/goods-receipts/` | Warehouse Worker | Create GRN (adds stock) |
| GET | `/api/docs/` | Any | Swagger UI |
| GET | `/api/redoc/` | Any | ReDoc |

## Business Logic
- **Stock reserve/deduct/release:** atomic via `select_for_update()` inside `transaction.atomic()`. Uses `F()` expressions for safe concurrent updates. Prevents negative stock (validated).
- **GRN creation:** auto-increments `Stock.qty`. Weighted-average cost recalculated from existing + incoming cost_price.
- **Stock movement audit:** every stock change logs a `StockMovement` entry with type, reference, user, timestamp.

## RabbitMQ Integration

### Publisher
- `inventory.stock.changed` — published on any stock level change
- `inventory.goods_received` — published on GRN creation
- `inventory.low_stock` — published when stock drops below threshold
- **Exchange:** `techhub.events` (topic)

### Consumer (`inventory-consumer` container)
- Listens for: `order.created`, `order.cancelled` (from order-service)
- On `order.created`: async reserve stock (idempotent)
- On `order.cancelled`: async release stock
- **Idempotency:** `ProcessedEvent` table stores `event_id` + content hash. Duplicate events are skipped.

## Auth & Permissions
- `GatewayAuthentication` — base class for all Django services
- `IsAdminUser` — for sensitive operations (suppliers, warehouse create)
- `IsAdminOrWarehouseWorker` — for GRN create, stock adjustments
- `IsAuthenticatedOrReadOnly` — general pattern

## Tests
- **Framework:** Django `TestCase` + `APITestCase`
- **Coverage:** models (Warehouse, Supplier, Stock, StockMovement, GRN), API (warehouse CRUD, stock reserve/deduct/release, GRN creation)
- **Run:** `python manage.py test`

## Known Issues
- No internal transfer endpoint (CONCEPT §4.2)
- No stock adjustment / write-off endpoints
- GRN delete doesn't reverse stock changes
- No `/health` endpoint (uses GET `/api/inventory/` as health check)
- No product validation (accepts any `product_id` without verification against product-service)
- DRF validation errors in English, not Ukrainian
