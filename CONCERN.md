# TechHub — Design Concerns

> **Audience:** architects, reviewers, future selves.
> **Purpose:** document design tradeoffs, risks, and things worth debating before they become legacy.

---

## 1. Gateway Role Gating Breaks All Non-Admin Writes

**Status:** Bug (highest impact).
**Files:** `nginx/auth.js`, `nginx/nginx.conf`, `frontend/proxy.ts`

`checkAndProxy` in njs blocks writes for any role except `admin`. This means:
- Customers can't check out (POST `/api/orders/`)
- Cashiers can't run POS (POST `/api/orders/pos/`)
- Warehouse workers can't create GRNs (POST `/api/inventory/goods-receipts/`)

**What's missing:** a per-route role map in the gateway that allows specific roles per endpoint, with `admin` implicitly passing all checks.

**Question:** Should role logic live in njs (fast, network-local) or be pushed to backend services (more testable, but duplicates enforcement)?

---

## 2. Saga Compensation Gap

**Status:** Known.
**Files:** `order-service/orders/views.py`, `inventory-service/inventory/views.py`

Order→Inventory reserve is a synchronous HTTP call. If it fails (network blip, timeout, insufficient stock), the order stays in `pending` forever. There is no:
- Compensating transaction to cancel the order
- Timeout-based cleanup worker
- Retry mechanism with backoff

The RabbitMQ consumer in inventory-service listens for `order.created` but the async path exists alongside the synchronous one — two paths for the same operation risk inconsistency.

**Question:** Go full saga (async reserve via RabbitMQ, inventory responds to order-service), or add compensation + retry to the existing synchronous path?

---

## 3. Dual-Source Authorization

**Status:** Design smell.
**Files:** `auth-service/src/routes/admin.ts`, `nginx/auth.js`

Auth has two ways to designate admins:
- `ADMIN_USER_IDS` env var (runtime whitelist, checked in auth-service admin middleware)
- `role` column in DB (checked by gateway njs and downstream `GatewayAuthentication`)

These are not synchronized. A user can be admin in the DB but not in `ADMIN_USER_IDS`, or vice versa.

**Recommendation:** Pick one. DB role is the natural source of truth — `ADMIN_USER_IDS` should become a bootstrap-only mechanism (seed initial admin on first deploy, then rely on DB roles).

---

## 4. No Idempotency on Synchronous Saga Calls

**Status:** Risk.
**Files:** `order-service/orders/views.py` (reserve/deduct/release calls)

The RabbitMQ consumer path has dedup via `ProcessedEvent` table. The synchronous HTTP path (order→inventory reserve/deduct/release) does not. Retry on network timeout means double-reserve or double-deduct.

**Fix:** Add idempotency key header on order-service side, store processed keys in inventory-service.

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

**Status:** Security finding.
**File:** `.env`

Google OAuth client ID/secret, GitHub OAuth client ID/secret, Stripe secret key, Resend API key — all committed to git history. Anyone with repo access has live credentials.

**Fix:** Revoke secrets, rotate them, add `.env` to `.gitignore`, document required env vars in `.env.example`.

---

## 7. Duplicated `GatewayAuthentication` Across Three Services

**Status:** Maintenance burden.
**Files:** `product-service/product_service/authentication.py`, `inventory-service/inventory_service/authentication.py`, `order-service/order_service/authentication.py`

Identical ~60-line class copy-pasted in each Django service. If the auth contract changes (new header, new parsing logic), all three must be updated.

**Options:**
- Extract to a shared Python package (pip-installable)
- Accept the duplication (services are loosely coupled, changes are rare)

Current choice is pragmatic for three services. Worth revisiting at five+.

---

## 8. `proxy_intercept_errors on` with `=200` on Auth-Check

**Status:** Observability gap.
**File:** `nginx/nginx.conf`

The `/auth-check` internal location returns HTTP 200 even on auth service failure (e.g., auth-service is down, Redis unreachable). The njs handler then sees empty headers and treats the user as anonymous — a silent degradation.

**Fix:** Return 502 on upstream auth failure so the gateway can distinguish "no session" from "auth service unavailable." Optionally expose a `/health` endpoint that reflects real auth-service status.

---

## 9. Cart Endpoints Have No CSRF or Auth

**Status:** Design tradeoff.
**Files:** `product-service/products/cart/views.py`, `product-service/products/cart/serializers.py`

Cart views set `authentication_classes = []` to allow anonymous access. This disables Django's CSRF middleware. Cart modifications (add item, merge) are write endpoints with no CSRF protection.

**Risk:** Low for a retail system (CSRF requires a targeted attack), but worth noting if the system handles sensitive user data.

---

## 10. Auth-Service Test Gap

**Status:** Coverage hole.
**File:** `auth-service/`

Single health-check test. Role CRUD, 2FA TOTP, OAuth flows, rate limiting, session management — all untested. Auth is the security boundary of the entire system.

**Recommendation:** Add at minimum: role assignment, session validation, 2FA enrollment/verification, rate-limit enforcement.

---

## 11. Order Detail Endpoint is Public

**Status:** Over-share risk.
**File:** `order-service/orders/views.py`

`OrderViewSet` uses `AllowAny` for retrieve. Anyone with a valid order UUID can view order details (customer name, phone, address, items, totals).

**Fix:** Gate with `IsAuthenticated` and filter by ownership for non-admin roles.

---

## 12. No Frontend Test Visibility

**Status:** Unknown quality.
**File:** `frontend/tests/`

Playwright tests exist but coverage, pass rate, and CI integration status are undocumented. E2E tests are the only way to validate the full auth flow (gateway → auth-service → njs → backend).

---

## 13. Stale CONTEXT.md Files

**Status:** Documentation drift.
**Files:** `*/CONTEXT.md`

Several CONTEXT.md files list RabbitMQ as "TODO" or "planned" — the implementation is live. These files are referenced by AGENTS.md as authoritative sources for new developers/agents.

**Fix:** Audit and sync.

---

## 14. `order_number` Collision Risk

**Status:** Rare but real.
**File:** `order-service/orders/models.py`

Generated as timestamp + random suffix with no uniqueness constraint or retry-on-collision. Under load, probability of duplicate is low but non-zero.

**Fix:** Add `unique=True` constraint and retry loop in generation.

---

## Summary Table

| # | Concern | Severity | Effort to Fix |
|---|---------|----------|---------------|
| 1 | Gateway blocks non-admin writes | Critical | Medium |
| 2 | Saga compensation missing | High | Medium |
| 3 | Dual-source auth (ADMIN_USER_IDS vs role) | Medium | Low |
| 4 | No idempotency on HTTP saga calls | High | Low |
| 5 | Cross-service checkout span | Medium | Large |
| 6 | Committed secrets | Critical | Low |
| 7 | Duplicated GatewayAuthentication | Low | Low |
| 8 | Auth-check hides upstream failures | Medium | Low |
| 9 | No CSRF on anonymous cart writes | Low | Low |
| 10 | Auth-service test gap | High | Medium |
| 11 | Order detail publicly accessible | Medium | Low |
| 12 | Frontend test status unknown | Medium | Low |
| 13 | Stale CONTEXT.md files | Low | Low |
| 14 | order_number collision risk | Low | Low |

---

*Generated from architecture review, 2026-06-26.*
