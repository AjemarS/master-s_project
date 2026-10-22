# Inventory Service

## Stack
- **Runtime:** Python 3.13 (slim in Docker)
- **Framework:** Django 5.2 + DRF 3.16
- **Database:** PostgreSQL 15 (`inventory_db`, port 5434)
- **Auth:** `GatewayAuthentication` — reads `X-Gateway-User-*` headers, syncs local Django User
- **Message Broker:** RabbitMQ (publishes only)
- **Docs:** drf-spectacular (Swagger, ReDoc)

## Port
- Container: 8001 (default)
- Docker compose: maps to 8001:8001

## Quick Start
```bash
python manage.py runserver 0.0.0.0:8001
python manage.py test --noinput
```

## Apps

### `inventory/`

#### Models
- **Warehouse** — storage location. Fields: `name`, `type` (`warehouse`/`showroom`), `address`, `active` toggle.
- **Stock** — stock level per product per warehouse. Unique constraint: `(product_id, warehouse_id)`. Atomic operations via `select_for_update`.
- **StockMovement** — audit log. Types: `receipt`, `transfer`, `sale`, `adjustment`, `write_off`, `reserve`, `release`, `deduct`. Tracks product, warehouse, quantity change, reference, user, timestamp.
- **Supplier** — vendor info: name, contact person, phone, email, address.
- **GoodsReceiptNote** — GRN header: supplier, date, notes, author, optional `purchase_order`. Created in one
  transaction: with a purchase order the items must be on it and within the remaining quantity, otherwise
  nothing (stock included) is written; the order becomes `partially_received` or `received`.
- **PurchaseOrder / PurchaseOrderItem** — `draft → sent → partially_received → received`, or `cancelled`;
  items carry `quantity`, expected `unit_cost`, `received_quantity` (`purchasing.py`).
- **GoodsReceiptItem** — GRN line: product, quantity, cost_price. On create: auto-increments `Stock.qty` and recalculates weighted-average cost.

#### Viewsets
- `WarehouseViewSet` — CRUD
- `StockViewSet` — list/filter by warehouse and product. Custom `@action` endpoints: `reserve`, `deduct`, `deduct_batch`, `release` (business-critical, atomic), `transfer`, `adjust`, `{id}/movements`.
- `StockMovementViewSet` — list/filter (audit log, staff only)
- `SupplierViewSet` — CRUD (reads staff only)
- `GoodsReceiptNoteViewSet` — list, retrieve, create only (`http_method_names` = GET/POST; a GRN is never edited or deleted, so stock changes are never reversed silently); `product_info` returns the last cost price
- `ActivityEventViewSet` — admin activity feed (GET list, POST)

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
| POST | `/api/inventory/stock/deduct/` | Internal | Deduct one product |
| POST | `/api/inventory/stock/deduct_batch/` | Internal | Write off all items of an order in one transaction (all or none); `from_reserved` consumes the order's reservation (shipping), otherwise only unreserved units are sold (POS) |
| POST | `/api/inventory/stock/release/` | Internal | Release reserved stock |
| POST | `/api/inventory/stock/transfer/` | Admin / Warehouse Worker | Move stock between warehouses (available units only) |
| POST | `/api/inventory/stock/adjust/` | Admin / Warehouse Worker | Set counted quantity (stocktake / write-off), logs `adjustment` |
| GET | `/api/inventory/stock/movements/` | Admin / Warehouse Worker | Stock movement audit log |
| GET | `/api/inventory/stock/{id}/movements/` | Admin / Warehouse Worker | Last 100 movements of a product |
| GET | `/api/inventory/suppliers/` | Admin / Warehouse Worker | Supplier list |
| POST | `/api/inventory/suppliers/` | Admin | Create supplier |
| GET | `/api/inventory/goods-receipts/` | Admin / Warehouse Worker | GRN list (purchase prices) |
| GET | `/api/inventory/goods-receipts/product_info/` | Admin / Warehouse Worker | Last cost price and stock of a product |
| GET | `/api/inventory/goods-receipts/supplier-stats/` | Admin | Per-supplier totals over all GRNs (items, value, deliveries, last delivery) |
| GET | `/api/inventory/stock/analytics/` | Admin | Per-product sales pace (`deduct`/`sale` movements), days of cover, turnover, dead stock over `?days=` (7..730, default 90) |
| PATCH | `/api/inventory/stock/{id}/reorder/` | Admin / Warehouse Worker | `{reorder_point, reorder_quantity}` (0 = off); both are hidden from non-staff stock reads |
| GET | `/api/inventory/stock/reorder-suggestions/` | Admin / Warehouse Worker | Lines with available ≤ reorder point; suggested = point + batch − available − on order − drafted; last supplier and cost (`?warehouse_id=`) |
| GET/POST/PATCH | `/api/inventory/purchase-orders/` | Admin / Warehouse Worker | Purchase orders (`?status=&supplier=&warehouse=`); PATCH only while `draft`, items replaced as a whole |
| POST | `/api/inventory/purchase-orders/{id}/status/` | Admin | `sent` (from draft) or `cancelled` (from draft / sent / partially received) |
| POST | `/api/inventory/stock/return_to_stock/` | Service (order-service) | Returned units back on stock, movement type `return`, idempotent |
| GET | `/api/inventory/stock/valuation/` | Admin | On-hand stock at `average_cost`, per product (used by order-service inventory-value report) |
| POST | `/api/inventory/goods-receipts/` | Admin / Warehouse Worker | Create GRN (adds stock) |
| GET | `/api/inventory/health/` | Any | Health check with DB probe |
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

### No consumer
Stock is reserved and released only by the synchronous HTTP saga from order-service
(`/api/stock/reserve|release|deduct/` with `Idempotency-Key`). Inventory does not consume `order.*` events:
a second, event-driven reservation double-counted `reserved` and could take the last unit from the HTTP saga.

## Auth & Permissions
- `GatewayAuthentication` — base class for all Django services
- `IsAdminUser` — for sensitive operations (supplier and warehouse writes)
- `IsAdminOrWarehouseWorker` — GRN create, transfer, adjust, and reads of suppliers, GRNs and movements
- `IsAuthenticatedOrReadOnly` — warehouses and stock levels (public: storefront availability, checkout showrooms)
- The gateway (njs) applies the same staff-only rule to supplier, GRN and movement reads

## Tests
- **Framework:** Django `TestCase` + `APITestCase`
- **Coverage:** models (Warehouse, Supplier, Stock, StockMovement, GRN), API (warehouse CRUD, stock reserve/deduct/release, GRN creation)
- **Run:** `python manage.py test --noinput`

## Known Issues
- Product validation on reserve/deduct calls product-service and is skipped (fails open) when it is unreachable
- DRF validation errors in English, not Ukrainian
