# AGENTS.md

- Run full stack: `docker compose up` from root.
- Architecture: Gateway (Nginx + njs) → Product (Django/DRF), Auth (Express/Better Auth), Frontend (Next.js 16).
  See per-service CONTEXT.md for specifics.
- Auth flow: Nginx proxies auth subrequest to /auth/me (auth-service returns X-User-* response headers) →
  njs conditionally blocks writes for unauthenticated users → injects X-Gateway-User-* headers →
  Product service trusts them via GatewayAuthentication. Frontend protects routes via proxy.ts middleware.
- Route ordering matters in nginx: prefix matches `/api/{path}`, `/media/{path}`, `/auth/{path}` must be declared
  before `/{path}`. nginx matches longest prefix first.
- Nginx config syntax check: `docker run --rm nginx-test nginx -t` (hostnames resolve only inside compose network).
- Services reference: `product-service/CONTEXT.md`, `auth-service/CONTEXT.md`,
  `nginx/CONTEXT.md`, `frontend/CONTEXT.md`.
- **Product-service tests are the spec.** They represent desired behavior and must never be altered.
  If a test fails, the bug is in the application code, not the test.
