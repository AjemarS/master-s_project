# Nginx Gateway

- Replaces the FastAPI gateway. Nginx (Alpine) with njs module for conditional auth.
- Port 80 (internal 8080). Njs module pre-installed in nginx:alpine image.
- Run: `docker compose up gateway`. No standalone test framework.
- Route order (first-match): `/, /gateway, /health, /api/payments/webhook` → orders, `/api/inventory/*` → inventory, `/api/orders/*` → orders, `/api/reports/*` → orders, `/api/notifications/*` → notifications, `/api/cart/*` → product, `/api/*` → product, `/media/*` → product, `/auth/*` → auth, `/*` → frontend.
- Auth: nginx `auth_request /auth-check` → auth-service `/auth/me` (returns `X-User-*` response headers). njs `checkAndProxy` reads auth headers, conditionally blocks writes. Gateway injects `X-Gateway-User-*` → downstream. GET/HEAD/OPTIONS = public (optional auth), POST/PUT/PATCH/DELETE = require auth.
- Auth-service change: `/auth/me` now returns `X-User-Id`, `X-User-Role`, `X-User-Email`, `X-User-Name` response headers alongside the JSON body. No semantic change — same data, same internal network.
- CORS: `map $http_origin` → server-level `add_header`, OPTIONS preflight handled via `if ($request_method = OPTIONS)`.
- WebSocket: `$connection_upgrade` map, only used for frontend proxy (Next.js HMR).
- Proxy includes: `proxy_api.conf` (auth + forwarded headers), `proxy_public.conf` (forwarded headers only), `proxy_frontend.conf` (WebSocket + forwarded headers).
- Header stripping: `proxy_hide_header` for content-encoding, content-length, transfer-encoding, connection, keep-alive, and CORS headers from upstream.
- Redirect rewriting: `proxy_redirect` for all internal service URLs → public `$scheme://$http_host/`.
- `nginx -t` fails outside Docker — hostnames only resolve inside the compose network. Expected.
