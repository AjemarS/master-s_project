# Frontend

## Stack
- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Font:** Geist (from Vercel)
- **i18n:** next-intl v4.13 (UA/EN)
- **Auth Client:** Better Auth client (React bindings)
- **E2E Tests:** Playwright
- **Path alias:** `~/*` → `./app/*`

## Port
- Container: 3000 (default)
- Docker compose: maps to 3000:3000

## Quick Start
```bash
npm run dev            # Development server
npm run build          # Production build
npm run lint           # ESLint
npx playwright test    # E2E tests
```

## Project Structure
```
app/
├── [locale]/                    # Locale-aware routes (ua, en)
│   ├── layout.tsx              # NextIntlClientProvider + generateMetadata
│   ├── (main)/                 # Storefront pages
│   │   ├── page.tsx            # Home (hero, categories, features, testimonials, CTA)
│   │   ├── products/           # Product catalog with filtering
│   │   ├── checkout/           # Checkout flow (cart → payment)
│   │   └── order/              # Customer orders
│   ├── admin/                  # Admin panel
│   │   ├── summary/            # Dashboard (stats, health)
│   │   ├── products/           # Product CRUD
│   │   ├── categories/         # Category management
│   │   ├── orders/             # Order management
│   │   ├── pos/                # POS terminal (cashier)
│   │   ├── reports/            # Sales reports
│   │   ├── warehouses/         # Warehouse management
│   │   ├── suppliers/          # Supplier management
│   │   ├── stock-movements/    # Stock movement log
│   │   ├── goods-receipts/     # GRN management
│   │   └── users/              # User management
│   └── page.tsx                # Fallback redirect to /ua
├── i18n/                       # next-intl config
│   ├── routing.ts              # Locale config (ua, en; prefix: always)
│   ├── navigation.ts           # Locale-aware Link, redirect, usePathname, useRouter
│   └── request.ts              # Message loading
├── lib/                        # Shared utilities
│   ├── api.ts                  # API client (fetch wrapper)
│   ├── types/                  # TypeScript types
│   ├── hooks/                  # Shared hooks
│   └── auth-client.ts         # Better Auth client config
├── messages/                   # Translation files
│   ├── ua.json                 # Ukrainian (~426 keys)
│   └── en.json                 # English
├── ui/                         # Shared components (shadcn/ui)
│   ├── components/             # Header, footer, sidebar, etc.
│   └── hooks/                  # UI-related hooks (use-toast, etc.)
├── globals.css                 # Tailwind imports + theme variables
└── proxy.ts                    # Auth + i18n middleware (Next.js 16 proxy, replaces middleware.ts)
```

## i18n / Localization
- **Library:** `next-intl` v4.13 with `localePrefix: "always"`
- **URL pattern:** `/{locale}/...` — e.g., `/ua/products`, `/en/admin/summary`
- **Default locale:** `ua` (Ukrainian). Root `/` → redirect to `/ua`
- **Language switcher:** Admin sidebar + storefront header toggle buttons
- **Messages:** `ua.json` (default, 426 keys), `en.json`
- **Components:** `useTranslations()` (client) / `getTranslations()` (server) from next-intl

## Auth Middleware (`proxy.ts`)
- **i18n:** uses `createIntlMiddleware` from `next-intl/middleware`
- **Auth:** verifies session via Better Auth client
- **Route protection:**
  - `/admin/*` — requires `admin` role (redirects to `/` if not admin)
  - `/checkout/*` — requires authenticated user
  - `/order/*` — requires authenticated user
- **Current gap:** `/pos/*` and `/warehouse/*` not gated for cashier/warehouse_worker roles (see CONCERN.md §1)

## API Client (`app/lib/api.ts`)
- Base URL: `/api` (proxied through gateway)
- Automatic `X-Request-Id` generation
- Error handling with toast notifications

## UI Components
- **shadcn/ui** with Radix primitives: Button, Card, Dialog, DropdownMenu, Input, Select, Table, Tabs, Toast, etc.
- **Theme:** Dark/light mode via `next-themes`
- **Admin sidebar:** Responsive sidebar with role-conditional menu items
- **POS interface:** Product search, cart, receipt, order confirmation flow

## Tests
- **Framework:** Playwright (E2E)
- **Run:** `npx playwright test`
- **Location:** `frontend/tests/`
- **Status:** Coverage and pass rate undocumented (see CONCERN.md §12)

## Known Issues
- Inventory pages (warehouses, suppliers, GRN, stock movements) are read-only — no mutation UIs for create/edit
- Testimonials hardcoded in Ukrainian (not in translation files)
- Role-specific route gating incomplete (cashier, warehouse_worker not protected in proxy.ts)
