# TechHub — Design Concerns

> **Audience:** architects, reviewers, future selves.
> **Purpose:** document design tradeoffs, risks, and things worth debating before they become legacy.

---

## 1. Gateway Role Gating Breaks All Non-Admin Writes

**Status:** Fixed.
**Files:** `nginx/auth.js`, `inventory-service/inventory/views.py`

`checkAndProxy` in njs already had per-route role mapping for `cashier`, `warehouse_worker`, and `admin`. The real issue was twofold:
1. Auth-service role enum only allowed `admin`/`user` (fixed in #3)
2. Inventory service `reserve`/`deduct` endpoints required `IsAdminUser()`, but order-service forwards the caller's role during saga calls — a cashier's POS sale would fail at the deduct step

**Fix:** Changed inventory `StockViewSet` permissions — `reserve`, `deduct`, `release` use `[IsAuthenticated()]` (gated at gateway level). `transfer`, `adjust` use `[IsAdminOrWarehouseWorker()]`.

---

## 2. Saga Compensation Gap

**Status:** Fixed.
**Files:** `order-service/orders/management/commands/cancel_stuck_orders.py`, `inventory-service/inventory/eventbus.py`

Order→Inventory reserve is a synchronous HTTP call. If it fails (timeout, inventory down), the order stayed in `paid` status forever with no stock reserved.

**Fix (order-service):** Added `cancel_stuck_orders` management command — finds `paid` orders older than N minutes (default 30), releases any reserved stock via inventory HTTP, sets status to `cancelled` and payment to `refunded`, publishes `order.cancelled` event.
- Usage: `python manage.py cancel_stuck_orders --dry-run` for dry run
- Scheduled via cron or k8s CronJob

**Fix (inventory-consumer):** `_handle_order_created` was defined but never called — the `order.created` handler in `_handle_event` only logged a message. Wired it up so async reserve works on the RabbitMQ path.

---

## 3. Dual-Source Authorization

**Status:** Fixed — `requireAdmin` now checks DB `role` column instead of `ADMIN_USER_IDS` env var. `ADMIN_USER_IDS` remains for initial bootstrap only.
**Files:** `auth-service/src/middleware/authMiddleware.ts`

Auth had two ways to designate admins:
- `ADMIN_USER_IDS` env var (runtime whitelist)
- `role` column in DB

**Fix:** `requireAdmin` middleware now checks `session.user.role === "admin"`. The Better Auth `admin()` plugin receives an empty `adminUserIds` array.

---

## 4. No Idempotency on Synchronous Saga Calls

**Status:** Fixed.
**Files:** `order-service/orders/views.py`, `inventory-service/inventory/views.py`

The RabbitMQ consumer path had dedup via `ProcessedEvent` table. The synchronous HTTP path (order→inventory reserve/deduct/release) did not.

**Fix:** Added `idempotency_key` to request body. Order-service sends deterministic keys (`{operation}-{order_id}-{product_id}`). Inventory-service checks `StockMovement` for existing operations before processing, returns 409 on duplicate.

---

## 5. Cross-Service Checkout Span

**Status:** Architectural tradeoff.
**Files:** `product-service/products/cart/`, `order-service/orders/`

Cart lives in product-service (session-based, no auth required). Checkout (order creation) lives in order-service. The checkout flow:
1. Read cart from product-service (GET `/api/cart/`)
2. Create order in order-service (POST `/api/orders/`)

If product-service is down, you can't read the cart. If order-service is down, you can't create the order. No distributed transaction ties them together.

**Question:** Would moving cart into order-service simplify checkout? The tradeoff is losing session-based anonymous carts (order-service would need port-forwarded anonymous cart logic).

---

## 6. Committed Secrets in `.env`

**Status:** Fixed — `.env` is in `.gitignore` (already), created `.env.example` with placeholder values.
**File:** `.env`

Google OAuth client ID/secret, GitHub OAuth client ID/secret, Stripe secret key, Resend API key — all were committed to git history.

**Note:** Actual secrets in git history are still exposed. Rotate affected keys in production.

---

## 7. Duplicated `GatewayAuthentication` Across Three Services

**Status:** Fixed — extracted to `shared-lib/shared_auth/authentication.py`. All three Django services import from the shared package.
**Files:** `shared-lib/shared_auth/authentication.py`, `shared-lib/setup.py`

Identical ~60-line class was copy-pasted in each Django service. If the auth contract changes (new header, new parsing logic), all three must be updated.

**Fix:** Created `shared-lib/` pip-installable package. Build context for Django services changed to project root (`.`) so `shared-lib/` is available during `docker build`. Each Dockerfile:
1. `COPY shared-lib /shared-lib`
2. `RUN pip install -e /shared-lib`

This pattern scales to any language — Node services would do `COPY shared-lib /shared-lib && npm install /shared-lib`. Volume mounts kept for dev hot-reload.

---

## 8. `proxy_intercept_errors on` with `=200` on Auth-Check

**Status:** Fixed — `502` is no longer intercepted, so auth-service failure propagates as 502 instead of silent degradation to anonymous.
**File:** `nginx/nginx.conf`

The `/auth-check` internal location returned HTTP 200 even on auth service failure (e.g., auth-service is down, Redis unreachable). The njs handler then saw empty headers and treated the user as anonymous — a silent degradation.

**Fix:** Removed `502` from the `error_page` catch-all. Auth-service failures now propagate as 502 Bad Gateway.

---

## 9. Cart Endpoints Have No CSRF or Auth

**Status:** Acknowledged tradeoff — added explicit `@csrf_exempt` decorator for transparency.
**Files:** `product-service/products/cart_views.py`

Cart views set `authentication_classes = []` to allow anonymous access. This disables CSRF. Cart modifications (add item, merge) are write endpoints with no CSRF protection.

**Risk:** Low for a retail system (CSRF requires a targeted attack), but worth noting if the system handles sensitive user data.

---

## 10. Auth-Service Test Gap

**Status:** Partially fixed.
**File:** `auth-service/src/__tests__/`

Auth is the security boundary of the entire system. Previously had 5 tests (schema validation only).

**Fix:** Added `schemas.test.ts` with 28 tests covering all CRUD schema edge cases: `createUserSchema` (8), `updateUserSchema` (6), `setRoleSchema` (8), `enableTwoFactorSchema` (4), `disableTwoFactorSchema` (3). Includes role enum validation for all 4 roles.

**Remaining gap:** Rate limiter, auth middleware, 2FA flows, OAuth, session management still untested (require Redis/DB).

---

## 11. Order Detail Endpoint is Public

**Status:** Fixed — requires authentication and filters by ownership for non-admin users.
**File:** `order-service/orders/views.py`

`OrderViewSet` used `AllowAny` for retrieve. Anyone with a valid order UUID could view order details (customer name, phone, address, items, totals).

**Fix:** Changed `retrieve` permission to `[IsAuthenticated()]`. Added ownership filtering in `get_queryset` — non-admin users only see their own orders.

---

## 12. No Frontend Test Visibility

**Status:** Documented.
**File:** `frontend/tests/`

Playwright E2E tests exist — 49 tests across 5 spec files:
- `home.spec.ts`: 6 tests (hero, features, CTA)
- `auth.spec.ts`: 11 tests (sign-in, OAuth buttons, sign-up)
- `navigation.spec.ts`: 13 tests (navigation, locale switching)
- `admin.spec.ts`: 15 tests (admin panel pages, CRUD)
- `products.spec.ts`: 4 tests (product catalog, filtering)

**Gap:** Pass rate and CI integration still undocumented. Tests require full stack running (`docker compose up`). Auth tests require configured OAuth providers.

---

## 13. Stale CONTEXT.md Files

**Status:** Fixed — all 6 CONTEXT.md files audited and synced to current state (2026-06-26).
**Files:** `*/CONTEXT.md`

Several CONTEXT.md files listed RabbitMQ as "TODO" or "planned" — the implementation is live. These files are referenced by AGENTS.md as authoritative sources for new developers/agents.

---

## 14. `order_number` Collision Risk

**Status:** Fixed — added retry loop on IntegrityError (max 3 attempts).
**File:** `order-service/orders/views.py`

Generated as timestamp + random suffix with `unique=True` constraint but no retry-on-collision. Under load, probability of duplicate was low but non-zero.

**Fix:** `_generate_order_number()` now accepts `attempt` parameter. `create()` and `pos()` catch `IntegrityError` and retry up to 3 times with suffixed order numbers.

---

## Summary Table

| # | Concern | Severity | Effort | Status |
|---|---------|----------|--------|--------|
| 1 | Gateway blocks non-admin writes | Critical | Medium | Fixed |
| 2 | Saga compensation missing | High | Medium | Fixed |
| 3 | Dual-source auth (ADMIN_USER_IDS vs role) | Medium | Low | Fixed |
| 4 | No idempotency on HTTP saga calls | High | Low | Fixed |
| 5 | Cross-service checkout span | Medium | Large | Open |
| 6 | Committed secrets | Critical | Low | Fixed |
| 7 | Duplicated GatewayAuthentication | Low | Low | Fixed |
| 8 | Auth-check hides upstream failures | Medium | Low | Fixed |
| 9 | No CSRF on anonymous cart writes | Low | Low | Acknowledged |
| 10 | Auth-service test gap | High | Medium | Partial |
| 11 | Order detail publicly accessible | Medium | Low | Fixed |
| 12 | Frontend test status unknown | Medium | Low | Documented |
| 13 | Stale CONTEXT.md files | Low | Low | Fixed |
| 14 | order_number collision risk | Low | Low | Fixed |

---

*Generated from architecture review, 2026-06-26. Updated 2026-06-26 with fixes for #1, #2, #3, #4, #6, #7, #8, #9, #10, #11, #12, #13, #14.*
