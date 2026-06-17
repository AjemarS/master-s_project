# AGENTS.md

- Run full stack: `docker compose up` from root.
- Architecture: Gateway (FastAPI) → Product (Django/DRF), Auth (Express/Better Auth), Frontend (Next.js 16).
  See per-service CONTEXT.md for specifics.
- Auth flow: Gateway verifies Better Auth session via /auth/me → injects X-Gateway-User-* headers →
  Product service trusts them via GatewayAuthentication. Frontend protects routes via proxy.ts middleware.
- Route ordering matters in gateway: `/api/{path}`, `/media/{path}`, `/auth/{path}` must be declared
  before `/{path}`. FastAPI matches first-declared.
- No CI/CD configured. No lint/typecheck scripts for Python services (gateway, product-service).
- Services reference: `product-service/CONTEXT.md`, `auth-service/CONTEXT.md`,
  `gateway/CONTEXT.md`, `frontend/CONTEXT.md`.
