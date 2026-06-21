# TechHub — System Status Report

**Date:** 2026-06-21  
**References:** `CONCEPT.md`, `order-service/REPORT.md`, `inventory-service/REPORT.md`

---

## 1. Executive Summary

All five services + frontend are structurally complete. Backend APIs, database schemas, RabbitMQ integration, and frontend pages exist for all services. The system compiles, deploys via `docker compose up`, and passes all existing tests.

**One critical gap blocks real usage: the role system.** CONCEPT.md defines four roles (Customer, Cashier, Warehouse Worker, Admin), but only two exist in the auth service (`user`, `admin`). The gateway enforces `admin` for all write operations, blocking customers from checkout, cashiers from POS sales, and warehouse workers from receiving goods.

---

## 2. Architecture — What's Built

```
Gateway (FastAPI) ──► Auth Service (Express/Better Auth)
    │                      │ roles: user, admin
    ├─ /api/* ─────────► Product Service (Django/DRF)  :8000  products_db
    ├─ /api/inventory/* ► Inventory Service (Django/DRF) :8001 inventory_db
    ├─ /api/orders/* ───► Order Service (Django/DRF)     :8002 orders_db
    ├─ /media/* ────────► Product Service
    ├─ /auth/* ────────► Auth Service                    :3001 auth_db
    └─ /* ─────────────► Frontend (Next.js 16)           :3000

    RabbitMQ :5672 — 4 queues, 2 consumers (inventory-consumer container)
    Redis :6379 — rate limiting, session cache
```

### Service Status at a Glance

| Service | Backend | Frontend | Tests | Health |
|---------|:-------:|:--------:|:-----:|:------:|
| **Gateway** | Complete | — | None | ✅ routes all traffic |
| **Auth Service** | Complete | Login/reg pages | Minimal | ✅ users, sessions, 2FA |
| **Product Service** | Complete | Catalog, cart | 23 tests | ✅ read open, write admin |
| **Inventory Service** | Complete | Read-only pages | 17 tests | ✅ stock ops atomic, RMQ bidirectional |
| **Order Service** | Complete | Orders, POS, reports | 15 tests | ✅ saga, status machine, RMQ publisher |
| **Frontend** | — | Storefront + admin | Playwright | ✅ all pages built |

---

## 3. The Role Gap — CONCEPT vs Reality

### 3.1 What CONCEPT Requires

CONCEPT.md §2, §9.2 defines **four roles** with distinct permissions:

| Role | Code Value | Primary Actions |
|------|:----------:|-----------------|
| Customer | `user` | Browse catalog, cart, online checkout, track orders |
| Cashier | `cashier` | POS sales, search products, offline checkout |
| Warehouse Worker | `warehouse_worker` | Receive goods (GRN), transfer between warehouses |
| Admin | `admin` | Full access — catalog, orders, users, reports |

### 3.2 What's Implemented

**Only two roles exist in code:** `admin` and `user`.

Auth service (`auth-service/src/validation/schemas.ts:17`):
```typescript
role: z.enum(["admin", "user"])   // cashier? warehouse_worker? Missing.
```

Gateway (`gateway/main.py:168`):
```python
# All write endpoints use this single check:
if require_admin and user.get("role") != "admin":
    raise HTTPException(403)
# No concept of "cashier" or "warehouse_worker"
```

Backend services (`GatewayAuthentication` in product/inventory/order):
```python
is_staff = role == "admin"          # cashier = staff? warehouse_worker = staff?
is_superuser = role == "admin"      # Only two states: admin or not
```

Frontend (`proxy.ts:50`):
```typescript
// Only one role check exists:
if (session.user.role !== "admin") { redirect("/") }
// No concept of /pos/* or /warehouse/* protected routes
```

### 3.3 Impact — What's Blocked

| Capability | Expected Role | Actual | Blocker |
|------------|:---:|:------:|---------|
| Customer checkout (`POST /api/orders/`) | `user` (any authenticated) | ❌ | Gateway requires `admin` |
| POS sale (`POST /api/orders/pos/`) | `cashier` | ❌ | Gateway requires `admin`; role doesn't exist |
| Create GRN (`POST /api/goods-receipts/`) | `warehouse_worker` | ❌ | Gateway requires `admin`; role doesn't exist |
| Internal transfer | `warehouse_worker` | ❌ | No endpoint exists |
| Stock adjustment / write-off | `warehouse_worker` / `admin` | ❌ | No endpoint exists |
| Inventory UI mutations | `warehouse_worker` / `admin` | ❌ | Frontend pages read-only |

**All four business processes from CONCEPT.md §4 are blocked for their intended roles:**

| Process | Intended Role | Works? |
|---------|:---:|:------:|
| §4.1 Inbound (GRN) | Warehouse Worker | ❌ Admin-only + no UI |
| §4.2 Internal Transfer | Warehouse Worker | ❌ No endpoint |
| §4.3 Online Sale | Customer | ❌ Gateway blocks checkout |
| §4.4 Offline/POS Sale | Cashier | ❌ Gateway blocks + role missing |

---

## 4. Capability Matrix — What Each Role Can Do Today

| Capability | Customer | Cashier | Warehouse Worker | Admin |
|------------|:--------:|:-------:|:-----------------:|:-----:|
| Browse catalog | ✅ | ✅ | ✅ | ✅ |
| Cart | ✅ | ❌ | ❌ | ❌ |
| View own orders | ✅ `/orders` | — | — | — |
| Create online order | ❌ blocked | — | — | ✅ |
| Create POS sale | — | ❌ blocked | — | ✅ |
| View all orders | — | — | — | ✅ |
| Change order status | — | — | — | ✅ |
| POS product search | — | ❌ blocked | — | ✅ |
| View warehouses/stock | — | — | — | ✅ |
| Create goods receipt (GRN) | — | — | ❌ blocked | ❌ no UI |
| View reports | — | — | — | ✅ |
| Manage users | — | — | — | ✅ |

**Key:** Only admin can use the system for anything beyond browsing.

---

## 5. Service-by-Service Summary

### 5.1 Auth Service

- **Status:** Complete for `user`/`admin`. No test coverage for roles.
- **Gap:** `setRoleSchema` accepts only `"admin" | "user"`.
- **Fix:** Expand enum to `"admin" | "user" | "cashier" | "warehouse_worker"`.
- **Note:** `requireAdmin` middleware uses `ADMIN_USER_IDS` env var, not DB role. This dual-source authorization is harmless but confusing.
- **Report:** `auth-service/` (no REPORT.md — none exists).

### 5.2 Product Service

- **Status:** Stable. 23 tests passing. `GatewayAuthentication` functional.
- **Gap:** `is_staff = role == "admin"` — no granular role. New roles need custom permission classes.
- **Stock update:** `ProductViewSet.update_stock` is admin-only. Could allow `warehouse_worker`.
- **Report:** N/A (no REPORT.md — service pre-dates the reporting initiative).

### 5.3 Inventory Service

- **Status:** Most complete backend of the new services. Atomic stock ops, bidirectional RabbitMQ (publisher + consumer with deduplication), separate consumer container. 17 tests.
- **Gap:** Gateway blocks warehouse workers. No transfer endpoint. Frontend read-only.
- **Detail report:** `inventory-service/REPORT.md`

### 5.4 Order Service

- **Status:** Structurally complete — models, API, saga integration, RabbitMQ publisher, POS endpoint. 15 tests.
- **Gap:** Gateway blocks customers and cashiers. No saga compensation (reserve failure doesn't cancel order). No stock pre-check.
- **Detail report:** `order-service/REPORT.md`

### 5.5 Gateway

- **Status:** Routes all traffic. Session verification works.
- **Gap:** `require_auth(request, require_admin=True)` is too coarse. Needs `allowed_roles` list parameter for granular route protection.
- **Blocked routes:** `POST /api/orders/` (should be authenticated user), `POST /api/orders/pos/` (should be cashier), `POST /api/goods-receipts/` (should be warehouse_worker).

### 5.6 Frontend

- **Status:** Storefront + admin panel built. POS, orders, inventory pages exist.
- **Gap:** `proxy.ts` only checks `role !== "admin"` for `/admin/*`. Needs `/pos/*` and `/warehouse/*` route groups.
- **Missing UI:** Inventory CRUD forms, GRN creation form, internal transfer UI.

---

## 6. Implementation Plan — Role System

### Phase A: Add Roles to Auth Service (smallest change)

| # | File | Change |
|---|------|--------|
| A1 | `auth-service/src/validation/schemas.ts` | `z.enum(["admin", "user", "cashier", "warehouse_worker"])` |
| A2 | `frontend/app/lib/types/index.ts` | Update `AdminUser.role` type |
| A3 | `frontend/app/admin/users/user-dialog.tsx` | Add "Cashier", "Warehouse Worker" to role selector |

**Impact:** New roles can be assigned via admin panel. No behavior change yet.

### Phase B: Gateway Role-Aware Routing

| # | File | Change |
|---|------|--------|
| B1 | `gateway/main.py` | Add `check_role(user, allowed_roles)` helper. Admin always passes: `role == "admin" or role in allowed_roles`. |
| B2 | `gateway/main.py` | `POST /api/orders/` → `require_auth(request)` (any authenticated user) |
| B3 | `gateway/main.py` | `POST /api/orders/pos/` → `check_role(["cashier"])` |
| B4 | `gateway/main.py` | `POST /api/goods-receipts/` → `check_role(["warehouse_worker"])` |
| B5 | `gateway/main.py` | Stock mutations → `check_role(["warehouse_worker"])` |
| B6 | `gateway/main.py` | `PATCH /api/orders/{id}/status/` → `check_role(["admin"])` (unchanged) |

### Phase C: Backend Services — Custom Permissions

| # | File | Change |
|---|------|--------|
| C1 | `*/authentication.py` (all services) | Store `user.gateway_role = role` on the User object |
| C2 | `product-service/products/permissions.py` | New `IsCashier`, `IsWarehouseWorker` permission classes |
| C3 | `inventory-service/inventory/permissions.py` | Same permission classes |
| C4 | `order-service/orders/permissions.py` | Same permission classes |
| C5 | All views | Replace `IsAdminUser()` with appropriate role permission class |

### Phase D: Frontend — Role-Based Routes

| # | File | Change |
|---|------|--------|
| D1 | `frontend/proxy.ts` | Add role-route mapping: `/pos` → `["admin", "cashier"]`, `/warehouse` → `["admin", "warehouse_worker"]` |
| D2 | `frontend/app/ui/components/header/` | Show POS link for cashiers, Warehouse link for warehouse workers |
| D3 | `frontend/app/admin/components/admin-sidebar.tsx` | Conditionally show items based on role |

### Phase E: Missing Endpoints & UI

| # | Service | Change |
|---|---------|--------|
| E1 | Inventory | Internal transfer endpoint (`POST /api/stock/transfer/`) |
| E2 | Inventory | Stock adjustment endpoint (`POST /api/stock/adjust/`) |
| E3 | Inventory | Write-off endpoint (`POST /api/stock/write-off/`) |
| E4 | Inventory UI | GRN creation form |
| E5 | Inventory UI | Warehouse/supplier CRUD forms |
| E6 | Inventory UI | Stock movement history page |
| E7 | Order | Saga compensation (reserve failure → cancel order) |
| E8 | Order | Stock availability pre-check before order create |
| E9 | Gateway/Order | `POST /api/orders/` route ordering: must be before catch-all `/api/orders/{path}` |

---

## 7. Non-Role Issues (Summary)

These are lower priority but documented in service reports. See `order-service/REPORT.md` §2 and `inventory-service/REPORT.md` §2 for details.

| # | Service | Issue | Severity |
|---|---------|-------|----------|
| N1 | Order | Saga compensation missing — reserve failure doesn't cancel order | High |
| N2 | Order | No stock availability pre-check before order create | High |
| N3 | Order | `inventory-value` report queries sold items, not inventory | Medium |
| N4 | Order | No product validation on order create (accepts any product_id) | Medium |
| N5 | Order | `order_number` generation may collide under load | Low |
| N6 | Inventory | No internal transfer endpoint (CONCEPT §4.2) | High |
| N7 | Inventory | No stock adjustment / write-off endpoints | Medium |
| N8 | Inventory | No product validation (no PRODUCT_SERVICE_URL) | Medium |
| N9 | Inventory | GRN delete cascade doesn't reverse stock changes | Medium |
| N10 | Inventory | DRF validation errors in English, not Ukrainian | Low |
| N11 | Order | No `/health` endpoint (uses `GET /api/orders/` as health check) | Low |
| N12 | Product | `total_stock` not updated via RabbitMQ consumer | Medium |
| N13 | Product | No `<Route/>` component for `<CartProvider>` — React 19 compatibility | Medium |
| N14 | All | CONTEXT.md files stale (RabbitMQ marked TODO but implemented) | Low |

---

## 8. Quick Summary

```
Backend  ████████████████████░  95% — APIs, models, saga, RabbitMQ done
Frontend ███████████████░░░░░░  75% — pages built, mutations missing for inventory
Roles    ████░░░░░░░░░░░░░░░░░  20% — only admin/user; the rest is blocked
Tests    ███████████░░░░░░░░░░  55% — product 23, inventory 17, order 15; gateway 0
```

**The single most impactful change:** Add `cashier` and `warehouse_worker` roles to auth service, then update gateway to enforce per-route role checks. This unblocks all four business processes (CONCEPT §4.1–4.4) for their intended roles.

**Immediate priority order:**
1. Auth service: expand role enum
2. Gateway: per-route role checks
3. Backend: store `gateway_role`, add custom permissions
4. Frontend: role-based routing, POS/warehouse pages
5. Missing endpoints (transfer, adjustment, saga compensation)

---

*Detailed per-service analysis: `order-service/REPORT.md`, `inventory-service/REPORT.md`*
