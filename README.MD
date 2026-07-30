# TechHub — Information System for Household Appliances Retail

A microservices-based e-commerce platform for household appliances retail. Built as a master's thesis project, TechHub demonstrates a production-grade architecture with bilingual (UA/EN) support, role-based access control, event-driven communication, and a full POS interface.

**Thesis:** *"Development and Deployment of an Information System for Household Appliances Retail"*

---

## Architecture Overview

TechHub runs 8 microservices behind an Nginx gateway, orchestrated via Docker Compose:

```
User → Gateway (Nginx + njs) → 8 microservices → 6 PostgreSQL databases
                              → RabbitMQ (event bus)
                              → Redis (caching, rate limiting)
```

| Service | Stack | Port | Purpose |
|---------|-------|------|---------|
| **Gateway** | Nginx + njs | 80 | Routing, auth subrequest, RBAC, CORS, rate limiting |
| **Auth Service** | Express + Better Auth | 3001 | Users, sessions, roles, 2FA, OAuth (Google/GitHub) |
| **Product Service** | Django + DRF | 8000 | Catalog, categories, cart, bilingual fields (UA/EN) |
| **Inventory Service** | Django + DRF | 8001 | Warehouses, stock, movements, suppliers, GRN |
| **Order Service** | Django + DRF | 8002 | Orders, POS, reports, Stripe payments, Saga pattern |
| **Notification Service** | Express | 8003 | In-app notifications, email (Resend), SSE |
| **Audit Service** | Express | 8005 | Centralized audit logging (HTTP + events) |
| **Frontend** | Next.js 16 | 3000 | Storefront, admin panel, POS (bilingual UA/EN) |

**Infrastructure:** RabbitMQ (topic exchange `techhub.events`), 6 PostgreSQL databases, Redis 7.

---

## Tech Stack

- **Gateway:** Nginx + njs (NGINX JavaScript module)
- **Backend:** Python 3.11 / Django 5.2 / DRF 3.16, Node.js 22 / Express
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Framer Motion, next-intl v4.13
- **Auth:** Better Auth v1.4.3 (sessions, 2FA, OAuth)
- **Databases:** PostgreSQL 15 (×6), Redis 7
- **Event Bus:** RabbitMQ 3.13 (topic exchange)
- **Authentication:** Gateway-injected `X-Gateway-User-*` headers, trusted by downstream Django services via `GatewayAuthentication`

---

## Quick Start

### Prerequisites

- Docker (24+)
- Docker Compose (v2.20+)
- Git

### Running the System

```bash
# Clone and start everything
git clone <repo-url>
cd techhub
docker compose up
```

This builds and starts all 16+ containers (services, databases, message broker, consumers). First build takes several minutes.

Open **http://localhost** in your browser.

### Useful Commands

```bash
# Start a specific service
docker compose up gateway frontend product-service

# View logs for a service
docker compose logs -f order-service

# Run tests in a Django service
docker compose exec product-service python manage.py test
docker compose exec order-service python manage.py test
docker compose exec inventory-service python manage.py test

# Run tests in an Express service
docker compose exec auth-service npm run test

# Frontend E2E tests
docker compose exec frontend npx playwright test

# Rebuild a single service
docker compose build --no-cache product-service
```

---

## Project Structure

```
techhub/
├── gateway/                  # Nginx + njs config
├── auth-service/             # Express + Better Auth
│   └── CONTEXT.md
├── product-service/          # Django + DRF (catalog, cart)
│   └── CONTEXT.md
├── inventory-service/        # Django + DRF (warehouses, stock)
│   └── CONTEXT.md
├── order-service/            # Django + DRF (orders, POS, payments)
│   └── CONTEXT.md
├── notification-service/     # Express (notifications, SSE)
│   └── CONTEXT.md
├── audit-service/            # Express (audit logging)
│   └── CONTEXT.md
├── frontend/                 # Next.js 16 (storefront + admin)
│   └── CONTEXT.md
├── nginx/                    # Gateway config
│   └── CONTEXT.md
├── shared-lib/               # Python shared library (auth, event bus)
├── docker-compose.yaml       # Development environment
├── docker-compose.prod.yaml  # Production profile
├── CONCEPT.md                # Detailed architecture documentation
├── PRODUCTION.md             # Deployment guide (OCI)
├── AGENTS.md                 # AI assistant context (OpenCode)
└── README.MD                 # This file
```

---

## Authentication Flow

1. Gateway intercepts all `/api/*` requests with an internal `auth_request` to `/auth/me`
2. Auth service returns session data + `X-User-*` response headers
3. njs `checkAndProxy()` evaluates role-based permissions (anonymous, user, cashier, warehouse_worker, admin)
4. Gateway injects `X-Gateway-User-*` headers (stripping originals for security)
5. Downstream Django services trust these headers via `GatewayAuthentication`

**Roles:** anonymous (read-only + cart), user (authenticated reads), cashier (POS + orders), warehouse_worker (GRN + stock), admin (full access).

---

## Event Bus (RabbitMQ)

TechHub uses a topic exchange `techhub.events` for asynchronous communication:

- **order.created** → consumed by inventory-consumer (reserve stock), notification-service (email receipt)
- **order.cancelled** → consumed by inventory-consumer (release stock)
- **order.status_changed** → consumed by notification-service (status update email)
- **inventory.stock.changed** → consumed by product-consumer (update denormalized stock)
- **inventory.goods_received** → consumed by product-consumer
- **inventory.low_stock** → consumed by notification-service (alert admins)
- **All events** → consumed by audit-service (persistent audit log)

---

## Further Reading

- [CONCEPT.md](./CONCEPT.md) — Detailed architecture, data flow, design decisions
- [PRODUCTION.md](./PRODUCTION.md) — OCI deployment guide (SSL, secrets, CI/CD, monitoring)
- [AGENTS.md](./AGENTS.md) — AI assistant context for development
- Per-service CONTEXT.md files (linked above) — Developer deep-dives per service

---

## License

Master's thesis project. Not licensed for production use.
