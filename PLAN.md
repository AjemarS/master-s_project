# TechHub — Development Plan

## Completed (Frontend Phase)

| # | Feature | 
|---|---------|
| F1 | Stock Movement Journal (`/admin/stock-movements`) |
| F2 | Warehouse Transfer UI (dialog on `/admin/warehouses`) |
| F3 | Inventory Value Report card on `/admin/reports` |
| F4 | Category CRUD page (`/admin/categories`) |
| F5 | Product detail expandable rows on `/admin/products` |
| F6 | Image upload in ProductFormDialog |
| F7 | New sidebar nav items: Categories, Stock Movements |

---

## New Features (User Specified)

### N0 — Anonymous Checkout Page

**Decision:** Checkout page accessible to anonymous users (no login required).

**Plan:**
1. **Storefront checkout page** — new page at `/checkout` (or `/cart/checkout`):
   - Cart review: items, quantities, prices
   - Customer info form: name, phone, email, delivery address
   - Order notes field
   - Place order button → `POST /api/orders/` (create order with `channel=online`)
2. **Gateway** — Allow `POST /api/orders/` from both authenticated and anonymous users:
   - Authenticated: use `X-Gateway-User-Id`
   - Anonymous: accept `customer_name`, `customer_phone`, `customer_email` in body
3. **Backend** — Order `create` accepts anonymous customer details.
4. **Order confirmation page** — Show order number and status after successful order.

**Dependency:** Requires N9 (anonymous cart) to be functional first.

---

### N1 — Extended Product Filters & Sorting

**Status:** Filters exist (search, min/max price, in-stock checkbox). No sorting. No category filter. No date range.

**Plan:**
1. **Add category filter** — dropdown populated from `categoryApi.getAll()`, send `?category=<id>` to API.
2. **Add date range filter** — from/to date inputs for `created_at`, use API's `?created_after=&created_before=` (verify product-service supports these).
3. **Add sortable headers** — clickable `<th>` with chevron indicators:
   - ID, Name, Price, Stock, Rating, Created At
   - Toggle asc/desc per column, only one active at a time
   - Send `?ordering=price` / `?ordering=-price` to API
4. **Preserve filters in URL** — `useSearchParams()` so refresh keeps filter state.
5. **Add stock range filter** — min/max stock inputs alongside existing price filters.

---

### N2 — Actual Reports

**Decision:** Simple reporting with Recharts. Time range filters. No complex dashboards.

**Plan:**
1. **Install Recharts** — `npm install recharts`
2. **Date range picker** — Add from/to date inputs on reports page.
3. **Backend** — Verify `GET /api/reports/sales/` and `GET /api/reports/revenue/` accept `?from=&to=` params. Add if missing.
4. **Charts:**
   - **Revenue over time (bar)** — daily revenue for selected period.
   - **Orders by channel (pie)** — online vs offline split.
   - **Margin trend (line)** — margin % day-by-day.
5. **CSV export** — Download current report data as CSV.

**Effort:** Low-medium. Recharts is straightforward.

---

### N3 — Full Internationalization (EN, UA)

**Current:** Zero i18n. Hardcoded mix of Ukrainian and English strings in UI. No locale infrastructure.

**Plan:**
1. **Install next-intl** — best fit for Next.js App Router. Supports server + client components, middleware-based locale detection.
2. **Locale structure:**
   ```
   app/
     [locale]/
       admin/...
   messages/
     en.json
     uk.json
   i18n.ts
   middleware.ts (locale redirect)
   ```
3. **Extract all strings** — buttons, labels, column headers, error messages, toast notifications, page titles, nav items.
4. **Backend locale** — DRF: `Accept-Language` header → return `name_uk` or `name_en` based on locale. Already planned in B7 (bilingual fields).
5. **Language switcher** — dropdown in header/sidebar, persist in cookie.
6. **Currency** — UAH for UA, USD for EN. `Intl.NumberFormat` with locale.
7. **Date formatting** — `Intl.DateTimeFormat` Ukraine vs US format.

**Effort:** High (touches every UI string). ~80+ translation keys.

---

### N4 — Expanded Admin Dashboard (/admin/summary)

**Current:** 4 stat cards (users, active, products, low stock) + navigation grid + system health.

**Plan:**
1. **Revenue card** — total revenue from `reportApi.revenue()`, with % change indicator.
2. **Recent orders widget** — last 5 orders with status badges, click to expand.
3. **Low stock alert widget** — list of products with stock < 10, link to products page pre-filtered.
4. **Orders by channel pie** — small chart: online vs offline split.
5. **Sales trend sparkline** — last 7 days order count (needs backend daily aggregation).
6. **Warehouse occupancy** — stock per warehouse as horizontal bars.
7. **Quick actions** — prominent buttons: "Create Order", "Add Product", "Create GRN".

**Effort:** Medium (frontend-heavy, some need chart data endpoints).

---

### N5 — Expanded RBAC

**Decision:**
- Admin = full access. Cashier = POS + own workspace. Warehouse worker = warehouse features only.
- No storefront access for cashiers/warehouse workers (admin panel only).
- `ADMIN_USER_IDS` kept as bootstrap for initial admin. Seeding creates initial admin, cashier, warehouse_worker.
- Each role has stripped UI: sidebar already filters by role.

**Role-access mapping:**

| Page | Admin | Cashier | Wh Worker |
|------|-------|---------|-----------|
| Огляд | ✅ | ✅ | ✅ |
| Товари | ✅ | ✅ (read-only) | ❌ |
| Замовлення | ✅ | ✅ | ❌ |
| POS | ✅ | ✅ | ❌ |
| Категорії | ✅ | ❌ | ❌ |
| Склади | ✅ | ❌ | ✅ |
| Постачальники | ✅ | ❌ | ✅ (read-only) |
| Накладні | ✅ | ❌ | ✅ |
| Рух товарів | ✅ | ❌ | ✅ |
| Звіти | ✅ | ❌ | ❌ |
| Користувачі | ✅ | ❌ | ❌ |

**Plan:**
1. **Gateway role enforcement** — `nginx/auth.js` reads `X-User-Role` header and gates requests (as described earlier).
2. **DB-backed roles** — Auth service reads role from DB, not just `ADMIN_USER_IDS`. Add `requireRole(role)` middleware.
3. **Seed initial accounts** — Bootstrap `admin@techhub.local`, `cashier@techhub.local`, `warehouse@techhub.local` on first start.
4. **Frontend** — Sidebar already filtered by role. Add read-only mode on products page for cashier (hide edit/delete buttons, disable create).

---

### N10 — Impersonation

**Decision:** Two-level impersonation:
- Admin can impersonate **cashier, warehouse_worker, user** (standard Better Auth feature)
- Cashier can impersonate **user** but only after **one-time code sent to user's email**

**Current state:**
- Better Auth v1.4.3 admin plugin has `auth.api.impersonateUser()` but no routes wrap it.
- Email sending exists (Resend) but `RESEND_API_KEY` not configured in `.env` — silent skip.
- `requireEmailVerification: true` is set but non-functional without Resend key.

**Plan:**
1. **Configure Resend** — Add `RESEND_API_KEY` to `.env` (dev or real key).
2. **Admin impersonation routes:**
   - `POST /auth/admin/impersonate` → `{ userId }` → calls Better Auth `impersonateUser()` → returns session cookie.
   - `POST /auth/admin/stop-impersonation` → ends impersonation.
3. **Cashier impersonation with email code:**
   - `POST /auth/impersonate/request-code` → `{ userEmail }` → generates 6-digit code (TTL 5min, Redis or DB), sends via Resend.
   - `POST /auth/impersonate/verify` → `{ userEmail, code }` → if valid, calls `impersonateUser()`.
   - Code storage: Redis with TTL (preferred) or in-memory cache.
4. **Indicators in UI** — Active impersonation badge in admin panel header.
5. **Email verification** — Need Resend key for this too. Currently `requireEmailVerification: true` blocks login without email verified. Options:
   - Option A: Configure Resend, emails work end-to-end.
   - Option B: Remove `requireEmailVerification` for dev (set `false`), keep for prod.
6. **Seed users** — Bootstrap users with verified email status for dev.

**Effort:** Medium. ~3 new routes + frontend impersonation badge + Resend config.

---

---

### N6 — Expanded Seeding Data

**Current:**
- `product-service`: 7 categories + 25 products (household appliances).
- `inventory-service`: 2 warehouses + stock for products 1-25 + 1 supplier.
- `order-service`: **None** — no seed script.
- `auth-service`: **None** — only auto-bootstraps one admin.

**Plan:**
1. **Order seed data** — Create 20-30 realistic orders:
   - Mix of online/offline, various statuses (pending/shipped/delivered/cancelled)
   - Orders spread across past 30 days for meaningful reports
   - Cost prices set so margin calculations work
2. **Auth seed users** — Add users with all roles:
   - `admin@techhub.local` (admin)
   - `cashier@techhub.local` (cashier)
   - `warehouse@techhub.local` (warehouse_worker)
   - `customer@techhub.local` (user)
   - All with password `password123` for dev
3. **More inventory data** — 3-5 suppliers, 5+ warehouses, stock movements for audit trail.
4. **Image placeholder** — Seed script should generate or reference placeholder images for products.
5. **Seed script for order-service** — Django management command `seed_orders.py`.

**Effort:** Low (scripts in each service). Critical for demo — reports/charts are empty without order data.

---

### N7 — Admin Logging Page

**Decision:** Removed for now. Will add later.

---

### N8 — Recent Products Feature

---

### N8 — Recent Products Feature

**Status:** Not implemented.

**Plan:** Quick, lightweight feature — track recently viewed products in admin panel.

1. **Frontend-only** — `localStorage` array of last 10 viewed product IDs (no backend needed).
2. **"Recent" section on admin summary page** — horizontal scroll of product cards.
3. **Product page click tracking** — on product detail expand, push product ID to recent list.
4. **Recent products sidebar widget** — small collapsible section in sidebar showing last 5 viewed.
5. **Clear recent** — button to clear list.

**Effort:** Very low. Pure frontend, ~1 hour.

---

### N9 — Accessible Cart for Anonymous Users

**Decision:** Server-side session cart. Full cart functionality unrelated to auth. Anonymous users get a session-based cart stored server-side.

**Plan (merge with B6):**
1. **Product-service:** Add `session_id` UUID field to Cart model. Make `user_id` nullable.
2. **Cart lookup:** Try `user_id` first (if authenticated), fallback to `session_id`.
3. **Frontend:** `useCart()` hook — generates UUID in `localStorage`, sends `X-Session-Id` header.
4. **Cart API unchanged** — same endpoints, work identically with or without auth.
5. **On login:** Merge session cart into user cart (sum quantities for duplicate products).

**No merge strategy discussion needed** — sum quantities for duplicates.

---

## Backend & Infrastructure (from prior analysis)

### B1 — Functional Roles (cashier, warehouse_worker)

→ **Merged into N5 (Expanded RBAC).** Gateway enforcement + seed users + DB-backed roles.

---

### B2 — Customer Order Flow

**Problem:** Customers (`user` role) can't create orders. Gateway blocks unauthenticated POSTs.

**Plan:**
1. Gateway `auth.js` — Allow `POST /api/orders/` for **any** authenticated user.
2. Backend — `created_by` from `X-Gateway-User-Id` header.
3. Frontend — Storefront checkout flow calls order API.

---

### B3 — Notification Service

**Problem:** `notification-service/` directory empty. Docker compose would fail. `inventory.low_stock` events go unhandled.

**Plan:**
1. Create minimal Python/FastAPI service:
   - RabbitMQ consumer for `inventory.low_stock`
   - Email/console output (configurable)
2. Dockerfile + docker-compose integration.
3. Optional: `order.status_changed` → notify customer.

---

### B4 — Migration Files

**Problem:** `product-service/` and `inventory-service/` have no `migrations/` tracked in git.

**Plan:** Run `makemigrations` in containers, commit generated files.

---

### B5 — Saga Compensation for Online Orders

**Problem:** Async reserve has no failure recovery. Orders stay `pending` forever.

**Plan:**
1. Inventory consumer — on reserve failure, publish `order.reserve_failed`.
2. Order consumer — listen for `order.reserve_failed`, auto-cancel order.
3. Alternative: Make online `create` do synchronous reserve (like POS).

---

### B6 — Session-Based Cart

→ **Merged into N9.** Add session_id, make user_id nullable, localStorage UUID.

---

### B7 — Bilingual Product Fields

**Problem:** Single `name`/`description`. No `_uk`/`_en` variants.

**Plan:**
1. Add `name_uk`, `name_en`, `description_uk`, `description_en` to Product + Category models.
2. Backfill: copy `name` → `name_uk`.
3. Migration, serializer update, frontend form update.

---

### B8 — Category Hierarchy

**Problem:** Flat category list. CONCEPT.md says hierarchical.

**Plan:**
1. Add `parent` FK (self-referential, nullable) to Category.
2. Migration, serializer, frontend tree/breadcrumb.

---

### B9 — Weighted-Average Cost Tracking

**Problem:** Stock has no `average_cost`. Margin uses snapshot-only `OrderItem.cost_price`.

**Plan:**
1. Add `average_cost` DecimalField to Stock.
2. Recalculate on GRN creation (weighted average formula).
3. Use `average_cost` as default for OrderItem cost_price.

---

### B10 — Stock Movement Date Filter UI

**Problem:** Backend supports `created_after`/`created_before`. Frontend journal has no date pickers.

**Plan:** Add date range inputs to `/admin/stock-movements` filter panel.

---

## Effort Grading

| Feature | Effort | Category | Why |
|---------|--------|----------|-----|
| **N8 — Recent Products** | 🟢 Very Low | Frontend-only | localStorage array, ~10 lines JS |
| **B10 — Stock Movement Date Filters** | 🟢 Very Low | Frontend-only | 2 date inputs in existing filter panel |
| **B4 — Migration Files** | 🟢 Low | Devops | Run `makemigrations` in containers |
| **N1 — Extended Filters & Sorting** | 🟢 Low | Frontend | Add to existing pattern, no new backend needed |
| **N4 — Dashboard Widgets** | 🟡 Low-Med | Frontend | Revenue card + recent orders + low stock alerts |
| **N6 — Seed Data (orders + auth)** | 🟡 Low-Med | Backend | Django management command + auth seed |
| **N2 — Reports with Recharts** | 🟡 Medium | Frontend | Install Recharts, 3 chart types, date picker |
| **N9 — Anonymous Cart** | 🟡 Medium | Full-stack | Session ID in product-service + frontend hook |
| **N5 — RBAC Roles** | 🟠 High | Full-stack | Gateway auth.js, DB roles, backend perms, frontend filtering |
| **N10 — Impersonation** | 🟠 High | Full-stack | Auth routes + email codes + frontend badge |
| **N0 — Anonymous Checkout** | 🟠 High | Full-stack | Checkout page + gateway changes + order backend |
| **N3 — Full i18n** | 🔴 Very High | Frontend-wide | Every component, ~80+ translation keys, next-intl restructure |
| **B5 — Saga Compensation** | 🟡 Medium | Backend | New RabbitMQ event + consumer |
| **B3 — Notification Service** | 🟠 High | New service | Empty directory, build from scratch |
| **B7 — Bilingual Fields** | 🟠 High | Full-stack | DB migration + serializers + frontend forms |
| **B8 — Category Hierarchy** | 🟡 Medium | Full-stack | DB migration + tree UI |
| **B9 — Weighted-Average Cost** | 🟡 Medium | Backend | Stock model cost field + recalc logic |

## Implementation Order (Low → High)

| Step | Feature | Effort |
|------|---------|--------|
| 1 | **N8 — Recent Products** | 🟢 Very Low |
| 2 | **B10 — Stock Movement Date Filters** | 🟢 Very Low |
| 3 | **N1 — Product Filters & Sorting** | 🟢 Low |
| 4 | **B4 — Migration Files** | 🟢 Low |
| 5 | **N4 — Admin Dashboard Widgets** | 🟡 Low-Med |
| 6 | **N6 — Seed Data** | 🟡 Low-Med |
| 7 | **N2 — Reports + Recharts** | 🟡 Medium |
| 8 | **N9 — Anonymous Cart** | 🟡 Medium |
| 9 | **N5 — RBAC Roles** | 🟠 High |
| 10 | **N10 — Impersonation** | 🟠 High |
| 11 | **N0 — Anonymous Checkout** | 🟠 High |
| 12+ | N3, B3, B5, B7, B8, B9 | Various |

---

## Architecture Weaknesses (Deferred)

| # | Weakness | Impact | Mitigation |
|---|----------|--------|------------|
| **W1** | **Cart spans product-service, orders on order-service** — checkout requires two services. If either is down, checkout fails. | Normal microservice complexity. | Already handled: cart creates session, order creates order. Saga pattern. |
| **W2** | **No CSRF protection on anonymous cart writes** — `authentication_classes = []` disables Django CSRF middleware for cart endpoints. Anonymous POSTs have no CSRF token validation. | Low — adding/removing cart items has no permanent side effects beyond cart state. | Accept for now. Cart has no destructive side effects. |
| **W3** | **Order `created_by` inconsistent across auth methods** — UUID for gateway users, empty string for anonymous, Django username for test auth. | Makes querying orders by user harder. | `my` endpoint handles all cases. Accept. |
| **W4** | **`/order/[id]` exposes order details to anyone with the ID** — `GET /api/orders/{id}/` is public (AllowAny). Customer name, email, items, price visible with any valid UUID. | Low — UUIDs are unguessable. No PII beyond name/email. | Add ownership check when user is authenticated. For anonymous, the order_id is already restricted by being a UUID. |
| **W5** | **Gateway has no circuit breaker for auth-service** — if auth-service is down, ALL authenticated requests fail. The `auth_request` subrequest would fail → gateway returns 502. | Medium — auth-service is a single point of failure for all write operations. | No change needed for thesis scope. Would need a caching layer or fallback. |
| **W6** | **No rate limiting on order creation** — `POST /api/orders/` is `AllowAny` with no nginx `limit_req`. A malicious actor could create unlimited orders. | Low for thesis scope. | Add nginx `limit_req` zone for `/api/orders/` location. |
| **W7** | **Impersonation code fallback logs to console** — when Resend is unavailable, impersonation codes are logged via `console.log`. If logs are exposed, codes could be intercepted. | Low for dev. Acceptable for thesis. | Use Redis-only with TTL. Console fallback is dev-only. |
