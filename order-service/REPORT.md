# Order Service — Status Report

**Date:** 2026-06-21  
**CONCEPT reference:** Phase 3 (Orders), Phase 4 (RabbitMQ Integration)

---

## 1. What We Have Now

### 1.1 Core — Done

| Layer | Status | Notes |
|-------|--------|-------|
| Django 5.2 + DRF 3.16 project | Done | Port 8002, `orders_db` (5435), identical stack to product-service |
| `Order` model | Done | `order_number`, `channel` (online/offline), `status` (pending/shipped/delivered/cancelled), `warehouse_id`, `customer_name/phone/email`, `total_amount`, `notes`, `created_by`, timestamps |
| `OrderItem` model | Done | FK→Order, `product_id`, `product_name`, `quantity`, `price`, `cost_price` |
| Status machine | Done | `pending→[shipped,cancelled]`, `shipped→[delivered,cancelled]`, `delivered→[]`, `cancelled→[]` |
| Migration `0001_initial` | Done | All DB indexes: `status`, `channel`, `customer_email`, `order_number` |
| GatewayAuthentication | Done | Reads `X-Gateway-User-*` headers, syncs local Django User (role→is_staff/is_superuser) |
| DRF pagination/filtering/search/ordering | Done | PageNumberPagination(20), DjangoFilterBackend, SearchFilter, OrderingFilter |
| Swagger / ReDoc | Done | `drf-spectacular` at `/api/docs/`, `/api/redoc/` |
| Django Admin | Done | Inline items, list display, list_filter, search |
| Ukrainian locale | Partial | `LANGUAGE_CODE=uk-ua`, `TIME_ZONE=Europe/Kyiv`, model verbose_names in Ukrainian. DRF error messages still in English (no .po files). |
| Docker deployment | Done | `docker-compose.yaml` — builds Dockerfile, runs migrate + runserver, depends on `orders_db` |
| ORDER_SERVICE_URL in gateway | Done | Gateway validates it as required env var |

### 1.2 API Endpoints — Done

```
GET    /api/orders/              List orders (filter: status, channel, customer_email; search: order_number, customer_name/phone/email)
POST   /api/orders/              Create online order (admin-only via gateway — see §3.1)
GET    /api/orders/{id}/         Order detail with items
PATCH  /api/orders/{id}/status/  Status transition (validated)
GET    /api/orders/my/           Current user's orders
POST   /api/orders/pos/          POS offline sale (admin-only via gateway — see §3.1)
GET    /api/reports/sales/       Sales report: total_orders, total_qty, total_revenue, total_cost, margin, by_channel
GET    /api/reports/revenue/     Revenue report: total_revenue, total_cost, gross_margin, margin_percent, order_count
GET    /api/reports/inventory-value/  Inventory value from OrderItem cost data (misleading — see §2.8)
```

### 1.3 Inventory Integration (HTTP Saga) — Done

| Trigger | Action | Status |
|---------|--------|--------|
| Online order created (warehouse_id set) | `POST /api/stock/reserve/` | Done |
| Status → shipped (warehouse_id set) | `POST /api/stock/deduct/` | Done |
| Status → cancelled (warehouse_id set) | `POST /api/stock/release/` | Done |
| POS sale created | `POST /api/stock/deduct/` | Done (immediate deduct, no reserve phase) |

### 1.4 RabbitMQ Publisher — Done

Despite CONTEXT.md saying "TODO", the publisher is fully implemented (`orders/eventbus.py`):
- Exchange: `techhub.events` (topic, durable)
- Events published: `order.created`, `order.status_changed`, `order.cancelled`
- Connection pooling, heartbeat, thread-safe channel creation

### 1.5 Frontend — Done

| Page | Path | Status |
|------|------|--------|
| Customer orders | `/(main)/orders/` | Done — expandable list with status/channel badges |
| Admin orders | `/admin/orders/` | Done — full management, filter tabs, status update dropdown |
| POS terminal | `/admin/pos/` | Done — product search, warehouse select, receipt, checkout via `orderApi.pos()` |
| Reports | `/admin/reports/` | Done — sales + revenue cards |
| Summary/Dashboard | `/admin/summary/` | Done — orders nav link, service health display |
| API client | `app/lib/api/admin-api.ts` | Done — `orderApi.getAll/getById/updateStatus/getMy/pos`, `reportApi.sales/revenue` |
| Footer link | `footer.tsx` | Done — "Мої замовлення" → `/orders` |

### 1.6 Tests — Done

`orders/tests.py` (168 lines):
- `OrderModelTest` (5 tests): create, status transitions, unique order_number, total_amount, channel choices
- `OrderItemModelTest` (2 tests): create item, belongs to order
- `OrderAPITest` (5 tests): list empty, create unauthorized→401, create admin→201, empty items→400, status valid/invalid, my orders filtering
- `POSAPITest` (1 test): pos order creates offline channel
- `ReportsAPITest` (2 tests): unauthenticated→401, admin→200

---

## 2. What's Wrong / Missing

### 2.1 CRITICAL: Gateway blocks non-admin checkout

**File:** `gateway/main.py:326-334`

```python
@app.api_route("/api/orders/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_orders(request: Request, path: str):
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        user = await verify_session(request)           # optional auth
        ...
    user = await require_auth(request, require_admin=True)  # ALL mutations = admin
```

**Problem:** Every POST/PATCH under `/api/orders/*` requires admin. This means:
- Customer cannot `POST /api/orders/` (online checkout) — **blocks the main customer flow**
- Cashier cannot `POST /api/orders/pos/` — **blocks POS sales**
- Only admin can create orders, which contradicts CONCEPT.md §10.4 and the entire business process design

**Fix needed in gateway:**
- `POST /api/orders/` → authenticated user (any role)
- `POST /api/orders/pos/` → cashier or admin
- `PATCH /api/orders/{id}/status/` → admin only (already correct)
- `GET /api/orders/` → optional auth (already correct)

This likely needs a dedicated route for `/api/orders/pos/` (or path inspection in the handler) since a single catch-all can't distinguish roles per sub-path.

### 2.2 No cashier role in auth system

Auth service has roles: `user`, `admin`. No `cashier` role. Gateway, order-service, and frontend proxy all check `role === "admin"`.

**Impact:** POS endpoint access control is wrong — admin currently required, should be cashier. Warehouse worker role also missing from auth system (needed by inventory-service).

### 2.3 Saga compensation missing — reserve failure doesn't cancel order

**File:** `order-service/orders/views.py:149-150, 156-171`

```python
if data.get("channel") == Order.ONLINE and data.get("warehouse_id"):
    self._reserve_stock(order)  # failures only logged, order stays pending
```

CONCEPT.md §7.5 specifies: *"If Step 2 (reserve) fails → Order Service cancels the order (compensating action)"*

Currently `_reserve_stock` only logs errors with `logger.error()`. The order is already committed and returned as 201. If reserve fails, the order exists but has no stock allocated — inconsistent state.

**Fix:** Either:
- Reserve stock inside the transaction (rollback on failure), OR
- If reserve fails after commit, cancel the order (status→cancelled + publish `order.cancelled`)

### 2.4 Stock availability not checked before order creation

Online checkout doesn't pre-check stock availability. It optimistically creates the order then tries to reserve. If stock insufficient:
- Order created successfully (201)
- Reserve silently fails
- Customer thinks order is placed but it has no allocated stock

CONCEPT.md §6.2 says reserve should be synchronous and on the critical path: *"if product is not available, order is not created"*

**Fix:** Check stock availability before creating order, or reserve inside the atomic transaction and roll back on failure.

### 2.5 inventory-value report is misleading

**File:** `order-service/orders/reports.py:44-63`

Named "inventory-value" but queries `OrderItem` table (sold items), not actual inventory. Should either:
- Rename to `cost-of-goods-sold` or similar, OR
- Query inventory-service for actual warehouse stock value

### 2.6 No product validation on order create

`POST /api/orders/` accepts any `product_id` without checking it exists in product-service. CONCEPT.md §8.3 discusses this validation explicitly.

### 2.7 Inventory service doesn't consume `order.created` / `order.cancelled`

CONCEPT.md §6.3 specifies:
- `order.created` → queue `inventory.order.reserve` (consumed by Inventory Service)
- `order.cancelled` → queue `inventory.order.release` (consumed by Inventory Service)

Order service publishes both events, but inventory-service has no consumer for them. The synchronous HTTP path handles reserve/release for now, so these queues are not strictly needed yet — but represent incomplete async path.

### 2.8 No idempotency on inventory HTTP calls

CONCEPT.md §8.1 specifies: *"Inventory Service supports idempotent operations (idempotency_key is passed)"*

Current calls don't send `idempotency_key`. If a request times out and is retried, double reserve/deduct could occur. Inventory service doesn't appear to accept one either.

### 2.9 No email/notification on order creation or status change

Customer gets no confirmation when order is placed or status changes. CONCEPT.md §6.1 notes `order.status_changed` is "for customer notifications (future)". Nothing implemented.

### 2.10 order_number generation may collide

`_generate_order_number()` uses `timestamp % 100000 + random(100, 999)` — collision possible under load. No retry logic on `IntegrityError`. Low risk but worth noting.

### 2.11 DRF error messages not localized

Despite `LANGUAGE_CODE=uk-ua`, DRF validation errors return in English (e.g., "At least one item is required." not "Потрібно хоча б один товар.").

### 2.12 No dedicated /health endpoint

Gateway health-checks `GET /api/orders/` which works but isn't a dedicated health endpoint. Other services may want one.

### 2.13 Customer "order tracking" page not separate

Frontend has `/orders` for "my orders" list, but CONCEPT.md §11.2 lists "Відстеження замовлення" as a distinct page with status visualization (pending→shipped→delivered pipeline). Currently the list page also shows status badges, so it partially serves this purpose.

### 2.14 No payment integration concept

CONCEPT.md doesn't mention payments, but a real checkout flow would include payment status (paid/unpaid/refunded). The current `status` field conflates fulfillment status with payment status. This is acceptable for the thesis scope (focused on inventory/logistics) but worth flagging.

### 2.15 Cost price tracking is pass-through only

`OrderItem.cost_price` is stored as whatever the client sends. CONCEPT.md §8.4 discusses weighted average cost, but no such logic exists. For POS, cost_price defaults to 0.00. For online, it's whatever the frontend sends. This means margin reports are only as accurate as the data sent.

---

## 3. What Should We Do Next (Priority Order)

### Immediate (blocks key user flows)

| # | Task | Why |
|---|------|-----|
| 1 | **Fix gateway auth: allow customers to POST /api/orders/** | Customer checkout is completely blocked. Either add role-aware path matching or split routes. |
| 2 | **Fix gateway auth: allow cashier to POST /api/orders/pos/** | POS sales are blocked for non-admin. |
| 3 | **Add cashier role to auth-service** | Needed for proper POS access control. May also need warehouse worker role. |
| 4 | **Make reserve stock failure cancel the order** | Saga compensation missing → inconsistent state when stock unavailable. |

### High (core functionality gaps)

| # | Task | Why |
|---|------|-----|
| 5 | **Pre-check stock availability before order create** | Per CONCEPT §6.2: "if product not available, order not created". Currently optimistic. |
| 6 | **Validate product_id against product-service** | Per CONCEPT §8.3. Prevents orders for non-existent products. |
| 7 | **Add idempotency_key to inventory HTTP calls** | Per CONCEPT §8.1. Prevents double reserve on retry. |
| 8 | **Implement inventory consumer for order events** | Inventory should consume `order.created`/`order.cancelled` per CONCEPT §6.3. Async path currently incomplete. |

### Medium (quality & completeness)

| # | Task | Why |
|---|------|-----|
| 9 | **Localize DRF validation errors** | Add Ukrainian `.po` files. DRF errors in English contradict `uk-ua` locale. |
| 10 | **Rename or fix inventory-value report** | Either rename to match what it reports or query actual inventory. |
| 11 | **Add dedicated /health endpoint** | Standard practice for container orchestration. |
| 12 | **Add order_number generation retry** | Handle IntegrityError collision gracefully. |

### Low (nice to have / thesis polish)

| # | Task | Why |
|---|------|-----|
| 13 | **Separate order tracking page** | Per CONCEPT §11.2 — visual status pipeline for customers. |
| 14 | **Email/notification on status change** | Not in CONCEPT scope but useful for demo. |
| 15 | **Weighted average cost logic** | Per CONCEPT §8.4 — more accurate margin reports. |
| 16 | **CONTEXT.md update** | Remove "RabbitMQ publisher (TODO)" — it's done. |
| 17 | **Rate limiting with Redis** | Per CONCEPT §13 — Redis-based instead of DRF default in-memory. |

---

## 4. Capability Visibility Matrix

What features do/don't work for each role *as seen by the user right now*:

| Capability | Customer | Cashier | Warehouse Worker | Admin |
|------------|:--------:|:-------:|:-----------------:|:-----:|
| View own orders | ✅ `/orders` | — | — | — |
| View all orders | — | — | — | ✅ `/admin/orders` |
| Create online order | ❌ blocked by gateway | — | — | ✅ works |
| Create POS sale | — | ❌ blocked by gateway | — | ✅ works |
| Change order status | — | — | — | ✅ `/admin/orders` |
| View sales reports | — | — | — | ✅ `/admin/reports` |
| View revenue reports | — | — | — | ✅ `/admin/reports` |
| POS product search | — | ✅ `/admin/pos` | — | ✅ `/admin/pos` |
| Health check | — | — | — | ✅ `/admin/summary` |

**Key findings:**
- Customer's primary action (checkout) does not work — gateway blocks it
- Cashier's primary action (POS sale) does not work — gateway blocks it, and no cashier role exists
- Warehouse worker has no order-service touchpoints (by design — they use inventory-service)
- Admin has full access and everything works

---

## 5. Quick Summary

**Overall:** Order service backend is structurally complete — models, API, inventory saga, RabbitMQ publisher, tests, and frontend all exist. The critical defect is **gateway authorization**: both customer checkout and POS sales are blocked because the gateway requires admin for all POST operations under `/api/orders/*`. Fixing gateway route auth (items #1-2) and adding the cashier role (item #3) would unblock the two most important user flows. The saga compensation gap (item #4) is the next serious concern for data consistency.
