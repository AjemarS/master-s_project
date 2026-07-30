# TechHub Frontend

Storefront, admin panel, and POS interface for the TechHub e-commerce platform. Bilingual (UA/EN) Next.js application serving customers, cashiers, warehouse workers, and administrators.

---

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Font:** Geist (from Vercel)
- **i18n:** next-intl v4.13 (UA/EN, locale prefix always)
- **Auth Client:** Better Auth client (React bindings)
- **HTTP Client:** Native fetch wrapper (`app/lib/api.ts`)
- **E2E Tests:** Playwright
- **Path alias:** `~/*` → `./app/*`

---

## Quick Start

```bash
# Development
npm run dev

# Production build
npm run build

# Lint
npm run lint

# E2E tests
npx playwright test

# Visual regression tests (update snapshots)
npm run test:visual

# Playwright UI mode
npm run test:ui
```

The frontend runs on **port 3000** by default. In Docker Compose, it's accessible at `http://localhost`.

---

## Key Routes

| Path | Audience | Description |
|------|----------|-------------|
| `/` → `/ua` | Public | Redirect to default locale |
| `/{locale}/` | Public | Home (hero, categories, features, CTA) |
| `/{locale}/products` | Public | Product catalog with filtering |
| `/{locale}/checkout` | Public | Checkout flow (cart → payment) |
| `/{locale}/order/*` | Auth user | Order history and details |
| `/{locale}/admin/summary` | Admin | Dashboard with stats and health |
| `/{locale}/admin/products` | Admin | Product CRUD |
| `/{locale}/admin/categories` | Admin | Category management |
| `/{locale}/admin/orders` | Admin | Order management |
| `/{locale}/admin/pos` | Cashier/Admin | POS terminal |
| `/{locale}/admin/reports` | Admin | Sales reports |
| `/{locale}/admin/warehouses` | Admin | Warehouse management |
| `/{locale}/admin/suppliers` | Admin | Supplier management |
| `/{locale}/admin/stock-movements` | Admin | Stock movement log |
| `/{locale}/admin/goods-receipts` | Warehouse/Admin | GRN management |
| `/{locale}/admin/users` | Admin | User management |

---

## i18n / Localization

- **Library:** next-intl v4.13 with `localePrefix: "always"`
- **URL pattern:** `/{locale}/...` — e.g., `/ua/products`, `/en/admin/summary`
- **Default locale:** `ua` (Ukrainian). Root `/` → redirect to `/ua`
- **Messages:** `app/messages/ua.json` (426 keys), `app/messages/en.json`
- **Components:** `useTranslations()` (client) / `getTranslations()` (server) from next-intl
- **Language switcher:** Admin sidebar + storefront header toggle buttons

---

## Auth Middleware (`proxy.ts`)

The `proxy.ts` file replaces the traditional `middleware.ts` pattern (Next.js 16 proxy):

- **i18n:** Uses `createIntlMiddleware` from next-intl
- **Auth:** Verifies session via Better Auth client
- **Route protection:**
  - `/admin/*` — requires auth, role-gated by granular per-page access map
  - `/checkout/*` — guest checkout allowed (no auth required)
  - `/order/*` — requires auth (user or admin)
  - Backstop: any unlisted `/admin/*` path requires admin role

---

## Project Structure

```
app/
├── [locale]/                    # Locale-aware routes (ua, en)
│   ├── layout.tsx              # NextIntlClientProvider + metadata
│   ├── (main)/                 # Storefront pages
│   └── admin/                  # Admin panel (summary, products, orders, POS, etc.)
├── i18n/                       # next-intl config (routing, navigation, request)
├── lib/                        # Shared utilities (api.ts, types/, hooks/, auth-client.ts)
├── messages/                   # Translation files (ua.json, en.json)
├── ui/                         # Shared components (shadcn/ui + custom)
│   ├── components/             # Header, footer, sidebar, etc.
│   └── hooks/                  # use-toast, etc.
├── globals.css                 # Tailwind imports + theme variables
└── proxy.ts                    # Auth + i18n middleware
```

---

## Testing

```bash
# Run all E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Update visual snapshots
npx playwright test --update-snapshots
```

Tests are located in `frontend/tests/`.

---

## Further Reading

- [CONTEXT.md](./CONTEXT.md) — Detailed developer reference for the frontend
- [AGENTS.md](../AGENTS.md) — Project-wide AI assistant context
- [CONCEPT.md](../CONCEPT.md) — Full architecture documentation
