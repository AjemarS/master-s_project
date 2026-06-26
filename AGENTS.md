# AGENTS.md

- Run full stack: `docker compose up` from root.
- Architecture: Gateway (Nginx + njs) → Auth (Express/Better Auth), Product (Django/DRF), Inventory (Django/DRF),
  Order (Django/DRF), Notification (Express), Frontend (Next.js 16).
  See per-service CONTEXT.md for specifics.
- Auth flow: Nginx proxies auth subrequest to /auth/me (auth-service returns X-User-* response headers) →
  njs checkAndProxy evaluates role-based permissions → injects X-Gateway-User-* headers →
  downstream Django services trust them via GatewayAuthentication.
  Frontend protects routes via proxy.ts middleware.
- Role-based access in njs: anonymous=read-only+cart+order-creation, user=authenticated reads,
  cashier=POS+orders, warehouse_worker=GRN+stock, admin=full.
- Event bus: RabbitMQ topic exchange `techhub.events`. Publishers: order-service, inventory-service.
  Consumers: inventory-consumer (order.created, order.cancelled with dedup),
  product-consumer (inventory.stock.changed), notification-service (order events, low stock).
- Route ordering matters in nginx: prefix matches `/api/{path}`, `/media/{path}`, `/auth/{path}` must be declared
  before `/{path}`. nginx matches longest prefix first.
- Nginx config syntax check: `docker run --rm nginx-test nginx -t` (hostnames resolve only inside compose network).
- Services reference: `product-service/CONTEXT.md`, `auth-service/CONTEXT.md`, `nginx/CONTEXT.md`,
  `frontend/CONTEXT.md`, `inventory-service/CONTEXT.md`, `order-service/CONTEXT.md`.
- Service test commands:
  - product-service: `docker compose exec product-service python manage.py test`
  - inventory-service: `docker compose exec inventory-service python manage.py test`
  - order-service: `docker compose exec order-service python manage.py test`
  - auth-service: `docker compose exec auth-service npm run test`
  - frontend: `docker compose exec frontend npx playwright test`
  - See CONCERN.md for known design issues and priorities.
