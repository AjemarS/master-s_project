# Inventory Service — Status Report

**Date:** 2026-06-21  
**CONCEPT reference:** Phase 2 (Inventory), Phase 4 (RabbitMQ Integration)

---

## 1. What We Have Now

### 1.1 Core — Done

| Layer | Status | Notes |
|-------|--------|-------|
| Django 5.2 + DRF 3.16 project | Done | Port 8001, `inventory_db` (5434) |
| `Warehouse` model | Done | name, type (warehouse/showroom), address, is_active |
| `Supplier` model | Done | name, contact_person, phone, email, address, is_active |
| `Stock` model | Done | product_id, warehouse FK, quantity, reserved; unique(product_id, warehouse); `available` property |
| `StockMovement` model | Done | 8 types: receipt, transfer, sale, adjustment, write_off, reserve, release, deduct; ref tracking, audit trail |
| `GoodsReceiptNote` + `GoodsReceiptItem` | Done | Full GRN with line items, auto-increments stock on create |
| `ProcessedEvent` model | Done | Idempotent event deduplication for RabbitMQ consumers |
| GatewayAuthentication | Done | Identical to other services — reads X-Gateway-User-* headers |
| DRF pagination/filtering/ordering | Done | PageNumberPagination(20), StockFilter, StockMovementFilter |
| Swagger / ReDoc | Done | drf-spectacular at `/api/docs/`, `/api/redoc/` |
| Django Admin | Done | All models registered with list_display, list_filter, search_fields |
| Ukrainian locale | Partial | LANGUAGE_CODE=uk-ua, model verbose_names in Ukrainian. DRF errors in English. |
| Docker deployment | Done | inventory-service (port 8001) + inventory-consumer (RabbitMQ listener) |
| Seed data command | Done | 2 warehouses, 25 stock entries, 1 supplier |

### 1.2 API Endpoints — Done

```
GET    /api/warehouses/            List warehouses
POST   /api/warehouses/            Create warehouse (admin-only via gateway)
GET    /api/warehouses/{id}/       Warehouse detail
PUT    /api/warehouses/{id}/       Update warehouse (admin-only)
DELETE /api/warehouses/{id}/       Delete warehouse (admin-only)
GET    /api/warehouses/{id}/stock/ Stock levels for a specific warehouse

GET    /api/stock/                 List all stock (filter: warehouse_id, product_id, min/max_quantity)
POST   /api/stock/reserve/         Reserve stock (internal — called by order-service)
POST   /api/stock/release/         Release reserved stock (internal — called by order-service)
POST   /api/stock/deduct/          Deduct stock (internal — called by order-service)
GET    /api/stock/{id}/movements/  Stock movement history for a given product

GET    /api/stock/movements/       List all movements (filter: product_id, type, from/to_warehouse, date range)

GET    /api/suppliers/             List suppliers
POST   /api/suppliers/             Create supplier (admin-only)
GET    /api/suppliers/{id}/        Supplier detail
PUT    /api/suppliers/{id}/        Update supplier (admin-only)
DELETE /api/suppliers/{id}/        Delete supplier (admin-only)

GET    /api/goods-receipts/        List GRNs (filter: supplier, warehouse)
POST   /api/goods-receipts/        Create GRN (admin-only via gateway — see §3.1)
GET    /api/goods-receipts/{id}/   GRN detail with items + total_amount
```

### 1.3 Stock Operations — Done (atomic)

All three mutation operations use `select_for_update()` + `F()` expressions inside `transaction.atomic()`:

| Operation | Guard | Effect |
|-----------|-------|--------|
| `reserve` | `available >= quantity` | `reserved += quantity` |
| `release` | `reserved >= quantity` | `reserved -= quantity` |
| `deduct` | `available >= quantity` | `quantity -= quantity`, `reserved -= min(reserved, quantity)` |

Each creates a `StockMovement` audit record. Only `deduct` publishes `inventory.stock.changed`.

### 1.4 GRN Creation — Done

`GoodsReceiptNoteViewSet.perform_create()` does:
1. Creates GRN + line items
2. For each item: get_or_create Stock, increment quantity via `F("quantity") + item.quantity`
3. Creates `StockMovement` (type=receipt) per item
4. Publishes `inventory.stock.changed` + `inventory.goods_received` per item (via `transaction.on_commit`)

### 1.5 RabbitMQ — Done (publisher + consumer)

```
PUBLISHER:
  inventory.stock.changed   → on deduct, GRN create
  inventory.goods_received  → on GRN create

CONSUMER (via inventory-consumer container):
  order.created   → _handle_order_created  — async reserve stock
  order.cancelled → _handle_order_cancelled — async release reserved stock

QUEUES DECLARED:
  inventory.order.reserve   (bound to order.created)
  inventory.order.release   (bound to order.cancelled)
  product.stock.sync        (bound to inventory.stock.changed)
  product.catalog.update    (bound to inventory.goods_received)
```

Idempotent via `ProcessedEvent` deduplication. Consumer is a Django management command (`consume_events`) running in a separate Docker container.

Docker compose wireup:
- `inventory-service` — runs `migrate && runserver 0.0.0.0:8001`
- `inventory-consumer` — runs `consume_events` (separate container, same image)
- Both depend on `inventory_db` (healthy) and `rabbitmq` (healthy)

### 1.6 Gateway Routing — Done but problematic

**File:** `gateway/main.py:314-322`

```python
@app.api_route("/api/inventory/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_inventory(request: Request, path: str):
    target_path = f"/api/{path}"                          # strips /inventory prefix
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        user = await verify_session(request)              # optional auth
        ...
    user = await require_auth(request, require_admin=True) # ALL mutations = admin
```

Note: `target_path = f"/api/{path}"` — gateway strips `/inventory/` from the URL path. So `/api/inventory/warehouses/` becomes `GET /api/warehouses/` on the inventory-service. Correct behavior.

### 1.7 Frontend — Done (read-only for inventory entities)

| Page | Path | Status |
|------|------|--------|
| Warehouses & Stock | `/admin/warehouses/` | Done — warehouse list + per-warehouse stock summary cards + full stock table (qty/reserved/available) |
| Suppliers | `/admin/suppliers/` | Done — supplier list with contact info, is_active badge |
| Goods Receipts | `/admin/goods-receipts/` | Done — GRN list with supplier, warehouse, receipt_date, total_amount |
| Admin sidebar | `admin-sidebar.tsx` | Done — Склади, Постачальники, Накладні in navigation |
| Summary/Dashboard | `/admin/summary/` | Done — inventory service health check + Склади nav link |
| API client | `admin-api.ts` | Done — warehouseApi, stockApi, supplierApi, goodsReceiptApi |
| TypeScript types | `types/index.ts` | Done — Warehouse, Stock, StockMovement, Supplier, GoodsReceiptNote, GoodsReceiptItem |

**Key gap:** All inventory frontend pages are **read-only**. No create/edit forms for warehouses, suppliers, or GRNs. The API supports mutations but the UI doesn't expose them.

### 1.8 Tests — Done

`inventory/tests.py` (272 lines):
- `WarehouseModelTest` (3 tests): create, showroom type, ordering
- `SupplierModelTest` (1 test): create supplier
- `StockModelTest` (3 tests): create, available property, unique_together constraint
- `StockMovementModelTest` (1 test): create movement
- `GoodsReceiptNoteModelTest` (2 tests): create GRN, items relationship
- `WarehouseAPITest` (3 tests): list empty, create unauthenticated→401, create admin→201
- `StockAPITest` (6 tests): list, reserve success/insufficient, deduct success/insufficient, release
- `GoodsReceiptAPITest` (1 test): create GRN with items→201, stock increments by item quantities

---

## 2. What's Wrong / Missing

### 2.1 CRITICAL: Gateway blocks warehouse worker mutations

Same pattern as order-service (`gateway/main.py:321`). All POST/PUT/PATCH/DELETE under `/api/inventory/*` require admin. This means:
- Warehouse worker cannot `POST /api/goods-receipts/` — **blocks the primary warehouse worker flow** (creating GRNs per CONCEPT.md §4.1)
- Warehouse worker cannot create/update suppliers
- Only admin can receive goods

CONCEPT.md §9.2 specifies warehouse worker should be able to manage GRNs. Currently impossible.

**Fix needed:**
- `POST /api/goods-receipts/` → warehouse worker or admin
- `POST /api/warehouses/`, `POST /api/suppliers/` → admin only (fine)

### 2.2 No warehouse worker role in auth system

Only `user` and `admin` roles exist. Need `warehouse_worker` role in auth-service, recognized by gateway and inventory-service. Same root cause as missing `cashier` role (found in order-service report).

### 2.3 No internal transfer endpoint

CONCEPT.md §4.2 describes the Internal Transfer business process:
> "Warehouse worker creates a transfer between warehouses. Stock decreases at source, increases at destination. StockMovement record created (type=transfer)."

`StockMovement.TRANSFER` type exists in the model, but no API endpoint or business logic exists. Cannot move stock between warehouses.

### 2.4 No stock adjustment / write_off endpoints

`StockMovement.ADJUSTMENT` and `StockMovement.WRITE_OFF` types exist but no API to use them. Inventory corrections and write-offs are standard warehouse operations.

### 2.5 No product validation

Stock, GRN items, and movements accept any `product_id` without verifying the product exists in product-service. CONCEPT.md §8.3 explicitly discusses this validation pattern.

Unlike order-service (which has `INVENTORY_SERVICE_URL`), inventory-service has no `PRODUCT_SERVICE_URL` env var, so it can't even attempt validation.

### 2.6 No weighted average cost logic

CONCEPT.md §8.4 describes weighted average cost calculation. `GoodsReceiptItem.cost_price` is stored but never used for average calculation. No average cost field on Stock model.

### 2.7 Reserve/release don't publish events

Only `deduct` publishes `inventory.stock.changed`. `reserve` and `release` do not. Since they don't change `quantity` (only `reserved`), this is arguably correct — product-service's total_stock is based on quantity, not reserved. But it means no audit event is emitted for reserve/release operations, which could be useful for monitoring.

### 2.8 Frontend missing mutation UI

All inventory pages are read-only despite having API support for creates/updates:

| Entity | API Create | UI Create Form |
|--------|:----------:|:--------------:|
| Warehouse | ✅ POST | ❌ No form |
| Supplier | ✅ POST | ❌ No form |
| Goods Receipt | ✅ POST | ❌ No form |

This means warehouse management must be done via Django Admin or direct API calls, not via the main frontend.

### 2.9 No stock movement history page in frontend

`GET /api/stock/movements/` and `GET /api/stock/{id}/movements/` exist but no frontend page displays movement history. This is the key audit trail and is invisible to users without API access.

### 2.10 Seed data is minimal

Only creates warehouses, stock, and one supplier. No GRNs, no stock movements, no transfer records. A demo environment looks empty for the inventory workflow.

### 2.11 No /health endpoint

Gateway health-checks `GET /api/warehouses/` which works but isn't a dedicated endpoint.

### 2.12 DRF validation errors not localized

Despite `LANGUAGE_CODE=uk-ua`, validation errors return in English (e.g., "Insufficient available stock" not Ukrainian).

### 2.13 StockMovement.SALE type unused

The `SALE` type exists in the model but is never created by any code path. The `DEDUCT` type is used instead when order-service calls `/api/stock/deduct/`. This creates ambiguity — is a DEDUCT a sale or something else? The `reference_type` field partially disambiguates, but having an unused SALE type is confusing.

### 2.14 No inbound/inventory receiving page in frontend

CONCEPT.md §11.3 lists "Оприбуткування → Створення накладних оприбуткування (GRN)" as an admin page. The frontend has `/admin/goods-receipts/` but it's read-only. No form to create a GRN with supplier, warehouse, and line items.

### 2.15 GRN delete cascade risk

Deleting a `GoodsReceiptNote` cascades to delete `GoodsReceiptItem` (via FK CASCADE). But it does NOT reverse the stock increment or clean up `StockMovement` records. Deleting a GRN creates inconsistent stock data.

### 2.16 CONTEXT.md is stale

CONTEXT.md says "RabbitMQ publisher (TODO)" but the publisher AND consumer are fully implemented with separate Docker container.

---

## 3. What Should We Do Next (Priority Order)

### Immediate (blocks key user flows)

| # | Task | Why |
|---|------|-----|
| 1 | **Fix gateway auth: allow warehouse workers to POST /api/goods-receipts/** | Warehouse worker cannot receive goods — blocks CONCEPT §4.1 Inbound flow. Need path-specific role check in gateway or dedicated route. |
| 2 | **Add warehouse_worker role to auth-service** | Needed for proper access control. Required by CONCEPT.md §9.2 role matrix. |

### High (core functionality gaps)

| # | Task | Why |
|---|------|-----|
| 3 | **Add internal transfer endpoint** | CONCEPT §4.2 requires warehouse-to-warehouse transfers. Missing entirely. |
| 4 | **Add PRODUCT_SERVICE_URL + product validation** | CONCEPT §8.3. Prevents GRNs/stock for non-existent products. |
| 5 | **Add stock adjustment + write_off endpoints** | Standard warehouse operations. Model supports them but no API. |
| 6 | **Add GRN creation form to frontend** | Admins/warehouse workers need to receive goods through the UI, not just Django Admin. |
| 7 | **Add warehouse/supplier CRUD forms to frontend** | Complete the admin panel for inventory management. |

### Medium (quality & completeness)

| # | Task | Why |
|---|------|-----|
| 8 | **Add stock movement history page to frontend** | Audit trail is invisible. Key for tracking what happened to inventory. |
| 9 | **Enrich seed data** | Add sample GRNs, movements, transfers. Makes demo usable. |
| 10 | **Localize DRF validation errors** | Ukrainian locale for stock errors (insufficient available, etc.). |
| 11 | **Add dedicated /health endpoint** | Standard for container orchestration. |
| 12 | **GRN delete safety** | Either prevent GRN deletion or implement compensating reverse of stock changes. |
| 13 | **Use SALE type for deductions from orders** | Distinguish order deductions from other deductions in StockMovement audit trail. |

### Low (nice to have / thesis polish)

| # | Task | Why |
|---|------|-----|
| 14 | **Weighted average cost logic** | CONCEPT §8.4. More accurate cost tracking across batches. |
| 15 | **Publish events on reserve/release** | Currently only deduct publishes stock.changed. Could be useful for monitoring. |
| 16 | **CONTEXT.md update** | Remove "RabbitMQ publisher (TODO)" — publisher and consumer are done. |
| 17 | **Rate limiting with Redis** | CONCEPT §13. DRF default is in-memory, not shared across replicas. |

---

## 4. Capability Visibility Matrix

What features do/don't work for each role *as seen by the user right now*:

| Capability | Customer | Cashier | Warehouse Worker | Admin |
|------------|:--------:|:-------:|:-----------------:|:-----:|
| View warehouses | — | — | — | ✅ `/admin/warehouses` |
| Create/update warehouse | — | — | — | ❌ no UI (API works) |
| View stock levels | — | ✅ POS product search uses it | — | ✅ `/admin/warehouses` |
| View suppliers | — | — | — | ✅ `/admin/suppliers` |
| Create supplier | — | — | — | ❌ no UI (API works) |
| View goods receipts | — | — | — | ✅ `/admin/goods-receipts` |
| Create goods receipt (GRN) | — | — | ❌ blocked by gateway | ✅ API only (no UI) |
| Internal transfer | — | — | ❌ no endpoint | ❌ no endpoint |
| Stock adjustment | — | — | ❌ no endpoint | ❌ no endpoint |
| View stock movements | — | — | — | ❌ no UI |
| Health check | — | — | — | ✅ `/admin/summary` |

**Key findings:**
- Warehouse worker's only action (create GRN) is blocked at gateway AND has no UI
- Admin can do everything via API but most mutation UIs are missing
- The internal transfer business process (CONCEPT §4.2) doesn't exist at all
- Inventory service is functional as a backend but invisible to most roles

---

## 5. Comparison with Order Service

| Aspect | Order Service | Inventory Service |
|--------|:---:|:---:|
| Core models | ✅ Complete | ✅ Complete |
| API endpoints | ✅ 6 main + 3 reports | ✅ 5 viewsets + 3 stock ops |
| Inventory saga integration | ✅ 3 HTTP calls (reserve/deduct/release) | ✅ 3 HTTP endpoints + async consumer |
| RabbitMQ publisher | ✅ 3 events | ✅ 2 events |
| RabbitMQ consumer | ❌ None | ✅ 2 queues (order.created, order.cancelled) |
| Event deduplication | ❌ Missing | ✅ ProcessedEvent model |
| Gateway auth per role | ❌ Admin-only for all mutations | ❌ Admin-only for all mutations |
| Missing role in auth | cashier | warehouse_worker |
| Frontend pages | ✅ 4 pages (orders, POS, reports) | ✅ 3 pages (read-only) |
| Frontend mutations | ✅ POS checkout, status update | ❌ All read-only |
| Tests | 15 tests (168 lines) | 17 tests (272 lines) |
| Seed data | ❌ None | ✅ 2 warehouses, 25 stock, 1 supplier |
| Docker consumer container | ❌ None | ✅ inventory-consumer |
| Product validation | ❌ None | ❌ None (no PRODUCT_SERVICE_URL) |
| Business process completeness | Online sale: partial (saga gap), POS: done, Cancel: done | Inbound (GRN): done, Transfer: missing, Stock corrections: missing |

---

## 6. Quick Summary

**Overall:** Inventory service is the most complete of the two new services in terms of backend architecture. Models are well-designed with proper constraints, stock operations are atomic (`select_for_update` + `F()`), RabbitMQ integration is bidirectional (publisher + consumer with deduplication), and a separate consumer container runs in docker compose. The critical defect mirrors order-service: **gateway authorization** blocks warehouse workers from their primary task (creating GRNs), and the role doesn't exist yet. Beyond that, the biggest functional gap is the missing **internal transfer** endpoint (CONCEPT §4.2) and the all-**read-only frontend** for inventory entities. The service is backend-complete but frontend-incomplete.
