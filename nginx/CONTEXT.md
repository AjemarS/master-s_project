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
1. `/`, `/gateway`, `/health` → static responses
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

### RBAC Matrix (in `nginx/auth.js`)
| Resource | Anonymous | User | Cashier | Warehouse Worker | Admin |
|----------|:---------:|:----:|:-------:|:----------------:|:-----:|
| Catalog (GET) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cart (all) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Orders (create) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Orders (view own) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Orders (status change) | ❌ | ❌ | ❌ | ❌ | ✅ |
| POS (create) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Warehouses/Stock | ❌ | ❌ | ❌ | ✅ | ✅ |
| GRN create | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suppliers CRUD | ❌ | ❌ | ❌ | ❌ | ✅ |
| Product/Category write | ❌ | ❌ | ❌ | ❌ | ✅ |
| Users manage | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reports | ❌ | ❌ | ❌ | ❌ | ✅ |

### `proxy_intercept_errors on` (Auth-Check)
`/auth-check` returns HTTP 200 even when auth-service is unreachable (empty headers → anonymous). This silences auth-service outages. See CONCERN.md §8.

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
- Rate limiting: `limit_req_zone` for `orders_create` (burst 5, 1r/s)
- WebSocket: `$connection_upgrade` map, only used for frontend proxy

## Known Issues
- See CONCERN.md §1 (gateway blocks non-admin writes — RBAC logic in njs may still gate to admin-only)
- `nginx -t` fails outside Docker — hostnames resolve only inside compose network. Expected.
