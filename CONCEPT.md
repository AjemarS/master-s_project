# TechHub — Master's Project Concept

> **Thesis**: *"Development and Deployment of an Information System for Household Appliances Retail"*

## Current State (June 2026)

System fully functional. Microservices run via Docker Compose. All core retail features implemented. Bilingual (UA/EN) frontend and backend.

---

## 1. Architecture

### 1.1 Overview

```
                         ┌─────────────────────────┐
                         │        Users             │
                         │   (browser/ POS / admin) │
                         └─────────────┬─────────────┘
                                       │ HTTP
                                       ▼
                         ┌─────────────────────────┐
                         │  Gateway (Nginx + njs)  │
                         │      Port: 80           │
                         │  Route + Auth + CORS    │
                         └──┬───────┬───────┬──────┘
                            │       │       │
              ┌─────────────┘       │       └─────────────┐
              ▼                     ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ Auth Service     │  │ Product Service  │  │  Frontend (Next) │
   │ (Express)        │  │ (Django/DRF)     │  │    Port: 3000     │
   │ Port: 3001       │  │ Port: 8000       │  │                  │
   │ DB: auth_db      │  │ DB: products_db  │  │  UA (default)    │
   │                  │  │                  │  │  EN variants     │
   │ Users/Sessions   │  │ Catalog          │  │  Storefront      │
   │ Roles/2FA/OAuth  │  │ Categories       │  │  Admin panel     │
   └──────────────────┘  │ Cart (session)   │  │  POS interface   │
                         │ Bilingual fields │  │                  │
                         └──────────────────┘  └──────────────────┘
         ┌──────────────────┐        ┌──────────────────┐
         │  Inventory       │        │   Order Service  │
         │  Service         │        │   (Django/DRF)   │
         │  (Django/DRF)    │        │   Port: 8002     │
         │  Port: 8001      │        │   DB: orders_db  │
         │  DB: inventory_db│        │                  │
         │                  │        │   Orders         │
         │  Warehouses      │        │   POS transactions│
         │  Stock levels    │◄──────►│   Revenue/Margin  │
         │  Stock movements │ HTTP   │   Daily sales     │
         │  Suppliers       │        │                  │
         │  Goods receipts  │        │                  │
         └──────────────────┘        └──────────────────┘
                  ▲                           │
                  │    ┌──────────────┐       │
                  └────┤  RabbitMQ    │◄──────┘
                       │  Port: 5672  │
                       └──────────────┘
```

### 1.2 Service Responsibilities

| Service | Stack | Responsible for | Communicates with |
|---------|-------|----------------|-------------------|
| **Gateway** | Nginx + njs | Entry point, routing, auth subrequest, RBAC, CORS | All services |
| **Auth Service** | Express + Better Auth | Users, sessions, roles, 2FA, OAuth (Google/GitHub) | — |
| **Product Service** | Django + DRF | Product catalog, categories, cart (session-based), bilingual fields | — |
| **Inventory Service** | Django + DRF | Warehouses, stock per location, stock movement audit, suppliers, Goods Receipt Notes | Product (product validation) |
| **Order Service** | Django + DRF | Orders (online + offline), order items, POS transactions, financial reports | Product (product info), Inventory (reserve/deduct) |
| **Frontend** | Next.js 16 | Storefront, admin panel, POS interface | Gateway (for all API) |

### 1.3 Communication

- **Synchronous HTTP** — real-time operations (stock check, reserve, deduct during checkout)
- **Async RabbitMQ events** — eventual consistency operations (total_stock update, notifications)

---

## 2. Authentication & Authorization

### 2.1 Auth Flow

```
1. Browser → Gateway → auth-service/auth/me (cookie-based subrequest)
2. Auth-service returns X-User-* headers + JSON
3. njs extracts X-User-* → conditionally blocks writes for unauthenticated
4. njs injects X-Gateway-User-* headers → downstream services
5. Downstream services trust headers via GatewayAuthentication
```

### 2.2 Route Protection

Routes processed by `nginx/auth.js` `checkAndProxy`:
- **Anonymous**: read-only, except cart routes and order creation
- **Authenticated**: role-based access
- **Admin**: full access
- **Cashier**: POS + order creation
- **Warehouse Worker**: goods-receipts, stock transfers

### 2.3 RBAC Matrix

| Resource | User | Cashier | Warehouse Worker | Admin |
|----------|:----:|:-------:|:----------------:|:-----:|
| Catalog (read) | ✅ | ✅ | ✅ | ✅ |
| Cart | ✅ | ❌ | ❌ | ❌ |
| Orders (create) | ✅ (own) | ✅ (POS) | ❌ | ✅ |
| Orders (view) | ✅ (own) | ✅ (own POS) | ❌ | ✅ (all) |
| Orders (status change) | ❌ | ❌ | ❌ | ✅ |
| Warehouses (view) | ❌ | ❌ | ✅ | ✅ |
| Goods Receipts (GRN) | ❌ | ❌ | ✅ | ✅ |
| Suppliers | ❌ | ❌ | ❌ | ✅ |
| Catalog (edit) | ❌ | ❌ | ❌ | ✅ |
| Users (manage) | ❌ | ❌ | ❌ | ✅ |
| Reports | ❌ | ❌ | ❌ | ✅ |

---

## 3. i18n / Localization System

### 3.1 Architecture

- **Frontend**: `next-intl` v4.13 with `localePrefix: "always"`
- **URLs**: `/{locale}/...` — e.g., `/ua/products`, `/en/admin/summary`
- **Default locale**: `ua` (Ukrainian)
- **Secondary locale**: `en` (English)
- **Root `/`** redirects to `/ua`

### 3.2 Route Structure

```
/ua                    → UA home page
/en                    → EN home page
/ua/products           → UA product catalog
/en/products           → EN product catalog
/ua/admin/summary      → UA admin panel
/en/admin/summary      → EN admin panel
...same pattern for all routes
```

### 3.3 Implementation

- **Message files**: `app/messages/ua.json`, `app/messages/en.json` (~400 keys each)
- **Locale detection**: `proxy.ts` uses `createIntlMiddleware` from `next-intl/middleware`
- **Navigation**: locale-aware `Link`, `useRouter`, `usePathname` from `~/i18n/navigation` (wraps `next-intl/navigation`)
- **Provider**: `NextIntlClientProvider` in `[locale]/layout.tsx`
- **Location**: i18n config lives in `app/i18n/` (routing.ts, navigation.ts, request.ts)
- **Metadata**: `generateMetadata` in `[locale]/layout.tsx` returns locale-specific `<title>`

### 3.4 Backend Bilingual Fields

- **Product**: `name_uk`/`name_en`, `description_uk`/`description_en`
- **Category**: `name_uk`/`name_en`, `description_uk`/`description_en`
- **Pricing**: UAH (default), USD when `Accept-Language: en` (`UAH_TO_USD_RATE = 41.5`)
- **Serializer**: `to_representation()` reads `Accept-Language` header, falls back to `name`/`description`
- **Gateway**: passes `Accept-Language` through to backend

### 3.5 Language Switcher

- **Admin sidebar**: UA/EN toggle buttons using `window.location.href`
- **Storefront header**: UA/EN toggle buttons in right-side actions area
- **Pattern**: `window.location.href = \/${lang.code}${pathname}` where `pathname` comes from locale-aware `usePathname` (strips locale prefix)

---

## 4. Business Processes

### 4.1 Goods Receipt (Inbound)

```
Supplier → Delivery → GRN creation → Stock added to warehouse
```

| Step | Action | Service |
|------|--------|---------|
| 1 | Worker creates Goods Receipt Note | Inventory |
| 2 | Stock added (qty + cost_price), weighted-average cost recalculated | Inventory |
| 3 | `inventory.stock.changed` published | → RabbitMQ |

### 4.2 Internal Transfer

```
Central warehouse → Transfer → Showroom
```

| Step | Action | Service |
|------|--------|---------|
| 1 | Worker creates transfer between warehouses | Inventory |
| 2 | Source stock decreased, destination stock increased | Inventory |
| 3 | Entry logged in `StockMovement` (type: `transfer`) | Inventory |

### 4.3 Online Sale

```
Customer → Browse → Cart → Checkout → Reserve → Ship → Deduct
```

| Step | Action | Service |
|------|--------|---------|
| 1 | Browse catalog, add to cart | Product |
| 2 | Checkout (order create) | Order (via Gateway) |
| 3 | Order created with status `pending` | Order |
| 4 | Order calls Inventory → **reserve** stock | Inventory (HTTP) |
| 5 | `order.created` published | → RabbitMQ |
| 6 | Admin changes status to `shipped` | Order |
| 7 | Order calls Inventory → **deduct** stock | Inventory (HTTP) |
| 8 | `inventory.stock.changed` published | → RabbitMQ |
| 9 | Status → `delivered` → `completed` | Order |

### 4.4 Offline Sale (POS)

```
Customer in showroom → Cashier via POS → Search → Sale → Deduct
```

| Step | Action | Service |
|------|--------|---------|
| 1 | Cashier searches product in POS | Frontend → Product |
| 2 | Cashier adds items to POS receipt, enters buyer info | Frontend |
| 3 | Cashier confirms sale | Order (via Gateway) |
| 4 | Order created: `channel=offline`, `status=delivered` | Order |
| 5 | Order calls Inventory → **deduct** from showroom | Inventory (HTTP) |

### 4.5 Order Cancellation

| Step | Action | Service |
|------|--------|---------|
| 1 | Admin sets status to `cancelled` | Order |
| 2 | Order calls Inventory → **return** reserved stock | Inventory (HTTP) |
| 3 | `order.cancelled` published | → RabbitMQ |

---

## 5. Data Architecture

### 5.1 Product Service (products_db, PostgreSQL)

| Entity | Description |
|--------|-------------|
| `Category` | Hierarchical categories. Bilingual fields: `name_uk`/`name_en`, `description_uk`/`description_en` |
| `Product` | Product with bilingual fields (`name_uk`/`name_en`, `description_uk`/`description_en`), pricing (UAH), energy class, warranty, images, total_stock |
| `Cart` | Session-based cart (UUID session_id or user_id). No auth required |
| `CartItem` | Cart item (product + quantity). Merge endpoint for anonymous→user |

### 5.2 Inventory Service (inventory_db, PostgreSQL)

| Entity | Description |
|--------|-------------|
| `Warehouse` | Warehouse/showroom. Name, type (`warehouse`/`showroom`), address, active |
| `Stock` | Stock level per product per warehouse. Unique: `(product_id, warehouse_id)` |
| `StockMovement` | Audit log. Types: `receipt`, `transfer`, `sale`, `adjustment`, `write_off`, `reserve`, `release`, `deduct` |
| `Supplier` | Supplier name, contact person, phone, email, address |
| `GoodsReceiptNote` | GRN. Supplier, date, notes, author |
| `GoodsReceiptItem` | GRN item. Product, qty, cost_price. On create: auto-increments Stock.qty |

### 5.3 Order Service (orders_db, PostgreSQL)

| Entity | Description |
|--------|-------------|
| `Order` | Order with auto-number, channel (`online`/`offline`), status (`unpaid`→`paid`→`delivering`→`delivered`→`completed`/`cancelled`), customer data, totals |
| `OrderItem` | Order line. Product, qty, price at sale, cost_price at sale (for margin calc) |

### 5.4 Auth Service (auth_db, PostgreSQL)

Managed by Better Auth:
- `user`: email, name, role, status
- `session`: token, IP, user agent, expiry
- `account`: linked OAuth accounts
- `verification`: email/2FA codes

---

## 6. Event-Driven Integration (RabbitMQ)

### 6.1 Event Catalog

| Event | Publisher | Consumers | Description |
|-------|-----------|-----------|-------------|
| `inventory.stock.changed` | Inventory | — (future: Product) | Stock level changed on any warehouse |
| `order.created` | Order | Inventory | New order → reserve stock |
| `order.cancelled` | Order | Inventory | Order cancelled → release stock |
| `order.status_changed` | Order | — (future) | Status change notifications |

### 6.2 Saga Pattern

Critical multi-service operations use Saga:
```
1. Order Service: Create order (status=pending)
2. Order → Inventory: Reserve stock (HTTP with idempotency_key)
3. If success → order confirmed
4. If failure → Order: Cancel order (compensating action)
```

---

## 7. API Design

### 7.1 Gateway Routes

```
/api/inventory/*     → inventory-service:8001
/api/orders/*        → order-service:8002
/api/reports/*       → order-service:8002
/api/notifications/* → notification-service:8003
/api/cart/*          → product-service:8000
/api/*               → product-service:8000
/media/*             → product-service:8000
/auth/*              → auth-service:3001
/*                   → frontend:3000
```

### 7.2 Product Service (`/api/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products/` | Product list (filtering, pagination, locale-aware) |
| GET | `/api/products/{id}/` | Product detail (locale-aware) |
| POST | `/api/products/` | Create product |
| GET | `/api/categories/` | Category list (locale-aware) |
| GET | `/api/cart/` | Cart contents (by session or user) |
| POST | `/api/cart/add_item/` | Add item |
| POST | `/api/cart/merge/` | Merge anonymous cart into user cart |

### 7.3 Inventory Service (`/api/inventory/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory/warehouses/` | Warehouse list |
| POST | `/api/inventory/warehouses/` | Create warehouse |
| GET | `/api/inventory/warehouses/{id}/stock/` | Stock by warehouse |
| GET | `/api/inventory/stock/` | Stock query (filter: `?warehouse_id=&product_id=`) |
| POST | `/api/inventory/stock/reserve/` | Reserve stock (internal) |
| POST | `/api/inventory/stock/deduct/` | Deduct stock (internal) |
| GET | `/api/inventory/stock/movements/` | Stock movement log |
| GET | `/api/inventory/suppliers/` | Supplier list |
| POST | `/api/inventory/suppliers/` | Create supplier |
| GET | `/api/inventory/goods-receipts/` | GRN list |
| POST | `/api/inventory/goods-receipts/` | Create GRN |

### 7.4 Order Service (`/api/orders/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders/` | Order list (filter: `?status=&channel=`) |
| POST | `/api/orders/` | Create order (checkout/POS) |
| GET | `/api/orders/{id}/` | Order detail |
| PATCH | `/api/orders/{id}/` | Update status |
| GET | `/api/orders/my/` | Current user's orders |
| POST | `/api/orders/pos/` | POS sale |
| GET | `/api/reports/sales/` | Sales report |
| GET | `/api/reports/revenue/` | Revenue & margin report |
| GET | `/api/reports/inventory-value/` | Inventory valuation |

---

## 8. Frontend

### 8.1 Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS v4** + shadcn/ui (Radix primitives)
- **Framer Motion** (animations)
- **next-intl v4.13** (i18n)
- **Lucide React** (icons)
- **Geist** (font)
- Dark/light theme

### 8.2 Route Structure (all under `/[locale]/`)

| Route | Purpose |
|-------|---------|
| `/` → `/ua` | Home (hero, categories, features, testimonials, CTA) |
| `/products` | Product catalog with filtering |
| `/checkout` | Checkout flow (cart → payment) |
| `/orders` | Customer's orders |
| `/admin/summary` | Admin dashboard (stats, health) |
| `/admin/products` | Product CRUD |
| `/admin/categories` | Category management |
| `/admin/orders` | Order management |
| `/admin/pos` | POS terminal |
| `/admin/reports` | Sales reports |
| `/admin/warehouses` | Warehouse management |
| `/admin/suppliers` | Supplier management |
| `/admin/stock-movements` | Stock movement log |
| `/admin/goods-receipts` | GRN management |
| `/admin/users` | User management |

### 8.3 Language Structure

- `proxy.ts`: i18n middleware + auth proxy (Next.js 16, replaces middleware.ts)
- `app/i18n/routing.ts`: locale config (ua, en; prefix: always)
- `app/i18n/navigation.ts`: locale-aware Link, redirect, usePathname, useRouter
- `app/i18n/request.ts`: message loading
- `app/messages/ua.json`, `app/messages/en.json`: translation files
- `app/[locale]/layout.tsx`: NextIntlClientProvider + generateMetadata
- Each page component uses `useTranslations()` (client) or `getTranslations()` (server)

---

## 9. Deployment

### 9.1 Docker Compose

```
Services:
  gateway           :80 (Nginx + njs)
  frontend          :3000 (Next.js)
  auth-service      :3001 (Express)
  product-service   :8000 (Django)
  inventory-service :8001 (Django)
  order-service     :8002 (Django)
  
  products_db       :5432 (PostgreSQL)
  auth_db           :5433 (PostgreSQL)
  inventory_db      :5434 (PostgreSQL)
  orders_db         :5435 (PostgreSQL)
  
  rabbitmq          :5672 (AMQP), :15672 (mgmt)
  redis             :6379
  ...

Network: microservices_network (bridge)
```

### 9.2 Key Nginx Config Points

- Route order: prefix matches must come before `/{path}`
- `/auth-check` internal location (returns 200 even on auth failure via `proxy_intercept_errors`)
- All API routes go through `auth_request /auth-check` + `js_content auth.checkAndProxy`
- CORS: njs-driven `checkOrigin`, server-level `add_header` for all responses
- WebSocket support for frontend HMR
- `proxy_redirect` rewrites internal service URLs to public

---

## 10. Current Status

### Done ✅

| Domain | Status |
|--------|--------|
| Gateway (Nginx + njs) | ✅ Fully functional |
| Auth Service (Express + Better Auth) | ✅ Users, sessions, roles, 2FA, OAuth |
| Product Service (Django/DRF) | ✅ Catalog, categories, cart, bilingual fields |
| Inventory Service (Django/DRF) | ✅ Warehouses, stock, movements, suppliers, GRN, events |
| Order Service (Django/DRF) | ✅ Orders, POS, reports, revenue/margin, Saga |
| RabbitMQ Integration | ✅ Events, consumers, deduplication |
| Frontend Storefront | ✅ Pages, catalog, cart, checkout, auth |
| Frontend Admin Panel | ✅ Products, orders, POS, reports, users, warehouses, suppliers, GRN, stock movements |
| Frontend i18n | ✅ UA/EN routes, message files (~400 keys), language switcher, bilingual backend fields |
| Agent Rules (AGENTS.md) | ✅ Context per service, test-as-spec rule |

### Known Issues 🐛

| Issue | Notes |
|-------|-------|
| `orders_db` test DB leftover | `EOFError` when running order-service tests (pre-existing) |
| Backend tests assertion count | Some tests pass system check but may have 0 assertions |
| `warehouse_worker`/`cashier` roles | Defined in auth but gateway/frontend gated — mutated views still require `admin` in many cases |
| Testimonials mock data | Hardcoded in Ukrainian (not yet extracted to translations) |
| Order service test DB prompt | `autoclobber` not set, prompts for user input |

---

## 11. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Runtime** | Python 3.11 (Django services), Node.js 20+ (Auth, Frontend) |
| **Frameworks** | Django 5 + DRF, Next.js 16, Express 5 |
| **Database** | PostgreSQL 15 (4 instances) |
| **Cache** | Redis 7 |
| **Message broker** | RabbitMQ 3.13 |
| **Gateway** | Nginx + njs (auth plugin) |
| **Frontend** | React 19, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **i18n** | next-intl v4.13 |
| **Auth** | Better Auth |
| **Payments** | Stripe (webhook integration) |
| **Notifications** | Resend (email), RabbitMQ events |
