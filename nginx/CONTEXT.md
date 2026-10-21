# Nginx Gateway

## Stack
- **Image:** `nginx:alpine` with njs module (NGINX JavaScript) pre-installed
- **Ports:** 80 (external) / 8080 (internal)
- **Config:** `nginx/nginx.conf` + `proxy_api.conf`, `proxy_public.conf`, `proxy_frontend.conf`
- **njs scripts:** `nginx/auth.js` (auth + RBAC), `nginx/cors.js` (CORS origin validation)

## Quick Start
```bash
# No standalone test framework. Run via Docker Compose:
docker compose up gateway
# Syntax check (only inside compose network — hostnames must resolve):
docker run --rm nginx-test nginx -t
```

## Architecture

### Route Order (longest prefix wins)
1. `/`, `/gateway` → static responses; `/health` → `health.js` probes each service's real health endpoint
   in parallel (internal `/_health/*`, 2 s connect / 3 s read timeout) and returns `healthy`/`degraded` per service.
   RabbitMQ status = the notification consumer's broker connection
2. `/api/payments/webhook` → order-service (no auth — Stripe webhook)
3. `/api/inventory/*` → inventory-service (auth)
4. `/api/orders/*` → order-service (auth)
5. `/api/reports/*` → order-service (auth)
6. `/api/notifications/*` → notification-service (auth)
7. `/api/cart/*` → product-service (auth)
8. `/api/*` → product-service (auth)
9. `/media/*` → product-service (no auth)
10. `/auth/*` → auth-service (no auth — Better Auth handles its own session)
11. `/*` → frontend (no auth — Next.js handles routing)

### Auth Flow
1. Nginx intercepts all `/api/*` requests with `auth_request /auth-check`
2. `/auth-check` internally proxies to `auth-service:3001/auth/me` with user cookies
3. Auth-service returns JSON session + `X-User-Id`, `X-User-Role`, `X-User-Email`, `X-User-Name` response headers
4. njs `checkAndProxy()` evaluates role-based permissions:
   - Anonymous (no headers): read-only, except cart + order creation
   - Authenticated by role: see RBAC Matrix below
5. If allowed: njs strips original `X-User-*` headers (security), injects `X-Gateway-User-*` headers
6. Downstream Django services trust `X-Gateway-User-*` via `GatewayAuthentication`

### RBAC Matrix (gateway `nginx/auth.js` + service permissions)
| Resource | Anonymous | User | Cashier | Warehouse Worker | Admin |
|----------|:---------:|:----:|:-------:|:----------------:|:-----:|
| Catalog, warehouses, stock levels (read) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cart | ✅ | ✅ | ✅ | ✅ | ✅ |
| Online order (create) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Pay for an order (`/api/orders/{id}/pay/`) | ✅ ¹ | ✅ ¹ | ❌ | ❌ | ✅ |
| Orders (view) | ❌ | own | own | own | all |
| Order status change | ❌ | ❌ | ❌ | ❌ | ✅ |
| POS sale | ❌ | ❌ | ✅ | ❌ | ✅ |
| Return / warranty claim (file) | ❌ | ✅ (own orders) | ❌ | ❌ | ✅ |
| Return / warranty claim (process) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Review (write) | ❌ | ✅ ² | ❌ | ❌ | ✅ ² |
| Review moderation, promo codes | ❌ | ❌ | ❌ | ❌ | ✅ |
| Stock movements, adjust, transfer | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suppliers (read) / GRN / purchase orders (draft, receive) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suppliers (write), purchase order send/cancel | ❌ | ❌ | ❌ | ❌ | ✅ |
| Catalog and category write | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reports, users, audit log | ❌ | ❌ | ❌ | ❌ | ✅ |

¹ The signed-in owner, or a guest with the order's `pay_token`; anyone else gets 404.
² Only buyers who received the product (product-service asks order-service).

Measured on the running stack (gateway + services) with the seeded accounts, 2026-10-21.

### `proxy_intercept_errors on` (Auth-Check)
`/auth-check` maps auth-service 400/401/403/404/500/503/504 to 200 with empty headers (the caller is anonymous). A connection failure (502) is not mapped: with auth-service down every `/api/*` request fails with 500, so an outage never turns signed-in users into anonymous ones (checked by stopping auth-service).

## CORS (nginx/cors.js)
- `checkOrigin(r)` — validates `Origin` against allowed list (localhost:3000, FRONTEND_URL, auth-service dev ports)
- Server-level `add_header` for all responses
- OPTIONS preflight handled via `if ($request_method = OPTIONS)`

## Proxy Includes

### `proxy_api.conf`
- Sets `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Request-Id`
- Passes `Accept-Language` header (for bilingual backend)
- WebSocket headers for order-service

### `proxy_public.conf`
- Forwarded headers only (no auth — used for media, webhooks)

### `proxy_frontend.conf`
- WebSocket support (Next.js HMR via `$connection_upgrade`)
- Forwarded headers
- `proxy_buffering off` for streaming (SSE from notification-service)

## Key Nginx Config Points
- Header stripping: `proxy_hide_header` for content-encoding, content-length, transfer-encoding, connection, keep-alive, and CORS headers from upstream
- Redirect rewriting: `proxy_redirect` maps internal URLs → public `$scheme://$http_host/`
- Rate limiting: `limit_req_zone` `orders_create` = 10 requests/min per IP, burst 5, HTTP 429; applies only to
  online order creation (`POST /api/orders/`). POS sales, order lists and status changes are not limited.
- WebSocket: `$connection_upgrade` map, only used for frontend proxy

## Known Issues
- Gateway blocks non-admin writes — RBAC logic in njs may still gate to admin-only
- `nginx -t` fails outside Docker — hostnames resolve only inside compose network. Expected.
