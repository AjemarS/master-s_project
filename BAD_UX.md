# BAD_UX.md — Frontend UX / A11y / i18n Review (TechHub)

**Date:** 2026-08-01
**Scope:** `frontend/` — Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui (Radix), framer-motion, animejs, next-intl (ua/en, localePrefix always), sonner, SWR
**Method:** good-ux skill + ui-ux-pro-max guidelines (99 rules) + manual code reads + explore delegation. Verified by direct file reads.

## Priority summary — top 5 to fix first

1. **Checkout post-order interruption** — SaveDialog (logged-in) / GuestPrompt (guest) open AFTER order create + pay succeed, BEFORE redirect to payment (conversion killer).
2. **Motion system ignores `prefers-reduced-motion`** — infinite marquee + FadeIn/Stagger + page transitions (only admin StatCard respects it).
3. **Products list filters/sort/pagination not in URL** — back button and sharing broken.
4. **Nested interactive elements** — wishlist `<button>` inside `<Link>` (ProductCard); clickable `<div>` without keyboard support (POS grid).
5. **Checkout form a11y** — no `autocomplete`, errors unannounced, not a `<form>`.

---

## 🔴 Critical

| # | Issue | Location |
|---|-------|----------|
| C1 | Checkout flow interruption: SaveDialog (logged-in) or GuestPrompt (guest) opens AFTER `orderApi.create` + `orderApi.pay` succeed, BEFORE `window.location.href` redirect to payment. User already committed to paying — worst possible moment for a modal. | `app/[locale]/checkout/page.tsx` |
| C2 | GuestPrompt is a raw `<div className="fixed inset-0 z-50 bg-black/50">` — NOT Radix: no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handling. | `app/[locale]/checkout/components/guest-prompt.tsx` |
| C3 | No global reduced-motion support. Marquee (animejs 40s infinite loop), FadeIn/Stagger (`whileInView`), and `(main)/template.tsx` page transitions all ignore `prefers-reduced-motion`. Only `StatCard` (admin summary) checks it. | `app/ui/components/motion/fade-in.tsx`, `motion/stagger.tsx`, `testimonials-with-marquee.tsx`, `app/[locale]/(main)/template.tsx` |
| C4 | Testimonials marquee: 40s infinite linear loop; content duplicated 4× → screen readers announce each testimonial 4×; pause on hover only (mouse, not touch); no `visibilitychange` pause; no reduced-motion. | `app/ui/components/testimonials-with-marquee.tsx` |
| C5 | **Nested interactive elements (invalid HTML):** wishlist `<button>` (z-30) nested INSIDE the `<Link>` wrapping the Card. Breaks keyboard tab order and screen-reader semantics. Wishlist button also only 32×32px. | `app/ui/components/product-card.tsx` (L88–141) |
| C6 | POS product grid: entire Card is a clickable `<div onClick>` with no `role`, `tabIndex`, or keydown handler → keyboard users cannot add products to receipt. | `app/[locale]/admin/pos/pos-product-grid.tsx` (L94) |

## 🟠 High

| # | Issue | Location |
|---|-------|----------|
| H1 | Products list: filters / sort / pagination are LOCAL state only — not reflected in URL (only initial `?category=`/`?search=` read once). Back button breaks, no shareable URLs, navigation loses filters. | `app/[locale]/(main)/products/page-content.tsx` |
| H2 | Checkout form: no `autocomplete` on name/email/phone; error `<p>` has no `role="alert"`/`aria-live`; inputs lack `aria-invalid`/`aria-describedby`; page is NOT a `<form>` (no Enter-to-submit). | `app/[locale]/checkout/components/personal-info-form.tsx` |
| H3 | Destructive bulk actions without confirmation: "Clear cart" and "Clear all" (notifications). | `app/ui/components/cart/cart-client.tsx`, `app/ui/components/notification-center.tsx` |
| H4 | Add-to-cart feedback inconsistent + dishonest: detail page fires `toast.success("addedToCart")` WITHOUT awaiting the API (fake 400ms "Adding…" delay; unhandled rejection on failure); products-list card catches errors silently (`// silent`) with no toast; similar-products add has NO feedback at all. | `app/[locale]/(main)/products/[slug]/page-client.tsx`, `products/page-content.tsx` |
| H5 | `h-screen` (not `min-h-dvh`) on auth pages → mobile browser-chrome jump (URL bar collapse). | `app/[locale]/(main)/sign-in/page.client.tsx`, `sign-up/page.client.tsx` |
| H6 | **Marketing consent PRE-CHECKED** by default on sign-up (`marketingConsent: true`) — dark pattern; GDPR/UA consent must be opt-in. | `app/[locale]/(main)/sign-up/page.client.tsx` |
| H7 | Home page: `getCategories`/`getLatestProducts` catch → `return []` silently (no error state/retry); NO `loading.tsx` for home (page blocks on awaited server fetches, no skeleton). | `app/[locale]/(main)/page.tsx` |
| H8 | Hardcoded non-i18n aria-labels across app: `aria-label="Sign in"` (EN — overrides translated visible text), `"Decrease quantity"`/`"Increase quantity"` (EN), `"Remove item"` (EN), `"Видалити з обраного"`/`"Додати до обраного"`/`"Обрані товари"` (UA), `"Previous image"`/`"Next image"`/`"Close lightbox"` (EN), `"Toggle menu"` (EN), `"Навігація"`/`"Адмінка"` (UA, mobile menu). | header.tsx, header-mobile-menu.tsx, product-card.tsx, product-gallery.tsx, cart-client.tsx, page-client.tsx (products/[slug]), sign-in |
| H9 | Social signup redirects to `/sign-in?registered=true` → already-logged-in user lands on the LOGIN page. Also: resend OTP shows NO success feedback. | `app/[locale]/(main)/sign-up/page.client.tsx` |
| H10 | Destructive security actions without confirmation: **Disable 2FA** fires immediately; **Revoke other sessions** fires immediately. | `app/[locale]/(main)/my/settings/page.client.tsx` (L830–844, L1005) |
| H11 | Missing `autocomplete` attributes (password managers + mobile UX): settings first/last name + phone + all password fields (`current-password`/`new-password`), 2FA password, forgot-password email (`email`), reset-password new passwords, POS customer name/phone, checkout personal info. | my/settings, forgot-password (L68), reset-password (L85/89), admin/pos/pos-receipt-panel.tsx, checkout |
| H12 | `not-found.tsx`: ALL copy hardcoded Ukrainian — EN users get Ukrainian text. | `app/[locale]/not-found.tsx` |
| H13 | Footer: uses raw `next/link` paths (`/products`, etc.) instead of i18n navigation → drops locale prefix → `/en` user clicking footer lands on `/ua/...`. Social icon links 32×32px icon-only with no aria-label. | `app/ui/components/footer.tsx` |
| H14 | Admin pages: hardcoded EN strings — `Refresh` button label and activity-feed messages (`Deleted product "…"`, `Order #… status changed to …`). | `app/[locale]/admin/products/page-client.tsx`, `admin/orders/page-client.tsx` |
| H15 | **i18n formatting hardcoded to uk-UA in `lib/utils/format.ts`:** `formatDate`/`formatDateTime`/`formatRelativeTime` force `uk-UA` plus Ukrainian relative words ("щойно", "хв. тому", "год. тому", "дн. тому"); `formatCurrency` is a UA (₴) / EN (USD) two-branch hack rather than true Intl-by-locale. EN users see Ukrainian dates/times/words in the admin activity feed and goods-receipts. | `app/lib/utils/format.ts`, `admin/components/dashboard/activity-feed.tsx`, `admin/goods-receipts/goods-receipt-table.tsx` (L22), `goods-receipt-detail-dialog.tsx` (L20) |
| H16 | **Admin module i18n: hardcoded EN strings** — users page toasts ("User removed", "User banned", "User unbanned", "Failed to remove user", "Failed to ban user"), stat labels ("Total Users"/"Admins"), user-table confirm titles ("Remove User"/"Unban User") and select placeholders ("All roles"/"All statuses"); `pushEvent` activity messages hardcoded EN in warehouses/suppliers ("Deleted warehouse #…", "Deleted supplier #…"); stock-movements literal `Refresh` button label. | `admin/users/page-client.tsx`, `admin/users/user-table.tsx`, `admin/warehouses/page-client.tsx`, `admin/suppliers/page-client.tsx`, `admin/stock-movements/page-client.tsx` |

## 🟡 Medium

| # | Issue | Location |
|---|-------|----------|
| M1 | StepIndicator: status dots only, no labels, color-only status (incomprehensible + color-only). | `app/[locale]/checkout/components/step-indicator.tsx` |
| M2 | Sign-in: shared `error` state rendered ONLY inside password TabsContent → social (GitHub/Google) login failure while on OTP tab is invisible. | `sign-in/page.client.tsx` |
| M3 | Disabled submit buttons with NO hint of what's missing: checkout Confirm (7+ conditions), POS submit, settings profile/password/address saves. | checkout, pos-receipt-panel, my/settings |
| M4 | Wishlist toggle: no toast feedback (only subtle fill change). | product-card.tsx |
| M5 | Touch targets too small (guideline ≥44px): cart qty steppers 28×28px (`h-7 w-7`); POS receipt qty/remove 24×24px (`h-6 w-6`); admin "Refresh" `h-7`; settings copy-secret `h-6 w-6`; footer social 32px; product-card wishlist 32px. | cart-client.tsx, pos-receipt-panel.tsx (L122/131/139), admin pages, my/settings (L917), footer.tsx |
| M6 | SaveDialog: Radix Dialog with controlled `open` but NO `onOpenChange` → Escape may not dismiss. | `checkout/components/save-dialog.tsx` |
| M7 | Search overlay clear (X) button: icon-only, no aria-label. | `header/search-overlay.tsx` |
| M8 | Language switcher: `window.location.href` full reload (loses SPA state) AND drops query params; globe button has no aria-label. | `header/header.tsx` |
| M9 | Newsletter form: `// Simulate API call` — 500ms fake delay + `localStorage.setItem` then `toast.success("subscribeSuccess")` — DECEPTIVE success, no server-side subscription. | `app/ui/components/newsletter-form.tsx` |
| M10 | No skip-to-content link anywhere in the app (grep: zero matches). | all layouts |
| M11 | My orders: icon-only Cancel (XCircle) and Expand (ChevronDown) ghost buttons have NO aria-label; search input has placeholder but no label; Tabs not URL-synced (inconsistent with settings page). | `my/orders/page-client.tsx` (L225, L229, L253) |
| M12 | Wishlist page: N+1 — `Promise.all` of per-product `getById` calls (no batch endpoint); `.catch(() => null)` silently drops failed products with no error feedback; `min-h-screen`. | `app/[locale]/(main)/wishlist/page.tsx` |
| M13 | Error messages rendered as plain `<p>` without `role="alert"`/`aria-live` across settings, sign-in, sign-up, forgot/reset, POS, orders. | (multiple) |
| M14 | Several pages not wrapped in `<form>` → Enter cannot submit: settings (profile/password/address), POS, checkout, my/orders search. | (multiple) |
| M15 | Order detail: no "Pay now" retry for unpaid orders (only "Continue shopping"); back link goes to home not orders list. | `app/[locale]/order/[id]/page.tsx` |
| M16 | POS stock-failure fallback: when `stockError`, `filteredProducts` returns ALL products (stock check skipped) → cashier may add out-of-stock items; stock loading/error messages lack `role="alert"`; product-grid add Button icon-only no aria-label; search input no label. | `admin/pos/page-client.tsx` (L106–109), `pos-product-grid.tsx` |
| M17 | Sign-up: display name = email (`signUp.email` passes `name: formData.email`); password-mismatch error only at top on submit, not inline; OTP step has no back/edit-email and no countdown (sign-in has one). | `sign-up/page.client.tsx` |
| M18 | `min-h-screen` (not `min-h-dvh`) across order page, POS, auth pages, wishlist, not-found. | (multiple) |
| M19 | ErrorBoundary: hardcoded UA text. | `(main)/error-boundary` |
| M20 | POS receipt customer phone input: not `type="tel"`, no autocomplete. | `pos-receipt-panel.tsx` (L94) |
| M21 | Dashboard data-viz accessibility: recharts Pie chart has no accessible name (no `role`/`aria-label`/`<title>`); stat-card sparkline `<svg>` has no `role="img"`/`aria-label`; system-health `StatusDot` is color-only (green/destructive) with hardcoded EN service labels ("Products", "RabbitMQ"). | `admin/components/dashboard/channel-pie-chart.tsx`, `stat-card.tsx`, `system-health-card.tsx` |
| M22 | Icon-only edit/delete buttons in category and user tables: no aria-label, `< 44px` touch target (`size="sm"` Pencil/Trash2). | `admin/categories/category-table.tsx`, `admin/users/user-table.tsx` |
| M23 | Checkout cart-items: `aria-label="Decrease quantity"`/`"Increase quantity"` hardcoded EN (translations available but unused); stepper buttons 36px (`size-9`) < 44px. | `app/[locale]/checkout/components/cart-items.tsx` |

## 🟢 Low

| # | Issue | Location |
|---|-------|----------|
| L1 | Hardcoded UA static pages (about, contacts, faq, terms, privacy, warranty, delivery-payment) + testimonials (documented Known Issue in frontend/CONTEXT.md). | (static pages) |
| L2 | 🎉 emoji used as success icon (sign-up success). | `sign-up/page.client.tsx` |
| L3 | TOTP input `placeholder="000000"` hardcoded. | `my/settings/page.client.tsx` (L936) |
| L4 | `toLocaleDateString()` renders in browser locale, not app locale (my/orders). | `my/orders/page-client.tsx` (L210) |
| L5 | Language change in settings triggers full reload (`window.location.href`) which drops `?tab=` param. | `my/settings/page.client.tsx` (L200–203) |
| L6 | Avatar `alt={userName || "User"}` — EN fallback. | `header/header-user.tsx` |
| L7 | Hero image `alt={t("heroTitle")}` reuses title text (should be decorative/empty or distinct). | `(main)/page.tsx` (L95) |
| L8 | stock-movements `lastUpdated` memo of `new Date()` never refreshes — stale timestamp. | `admin/stock-movements/page-client.tsx` |

## ✅ Strengths (verified — keep)

- `focus-visible` rings on ALL primitives (button, input, select, tabs, accordion, switch, checkbox, radio, slider); no global `outline: none` override.
- Radix dialogs/sheets with focus trap + `DialogTitle`/`DialogDescription`: POS sale-confirm (CLEAN), settings 2FA enable wizard, address dialog, product lightbox.
- SearchBar: full combobox ARIA (`combobox`/`listbox`/`option`, ArrowUp/Down/Enter/Escape, click-outside, `aria-activedescendant`).
- `aria-live="polite"` stock status on product detail.
- Labels with `htmlFor` everywhere; real `<form>` semantics on forgot-password, reset-password, newsletter, sign-in.
- My orders: cancel uses `window.confirm`, optimistic update with rollback, `Skeleton` loading, `Alert` error with reload button, empty states with CTA, archive toggle.
- Settings: tabs synced to URL (`?tab=`), inline live password validation, marketing consent opt-in (correct), optimistic toggle with revert on failure.
- Empty states + CTAs on wishlist/orders/admin lists; admin delete + status-change have ConfirmDialogs.
- Image `alt` all dynamic (product/category names); reset-password correctly wraps `useSearchParams` in `Suspense`.
- `admin/error.tsx` with reset button; localized `not-found.tsx`; per-module `loading.tsx`; `apiCall` `{data|error}` envelope + centralized error-handler toasts; SWR revalidation.
- Admin confirms translated in categories/warehouses/suppliers; stock-movements uses `useLocale` for `formatDate` (correct pattern); checkout delivery/payment sections clean (no hardcoded strings).
- product-image / category-image: CLEAN — dynamic alt + initials fallback.

## Suggested fix order

1. C1 + C2 (checkout flow + GuestPrompt semantics)
2. C3 + C4 (motion / reduced-motion)
3. H1 (products filters → URL search params)
4. C5 + C6 (nested/clickable a11y)
5. H2 + H11 (checkout form a11y + autocomplete sweep)
6. H8 (i18n aria-labels sweep)
7. H3 + H10 (confirmation dialogs: clear cart, clear notifications, disable 2FA, revoke sessions)
8. H6 (consent opt-in), H7 (home error/loading), H9 (signup flows), H12/H13/H14/H15/H16 (i18n gaps: not-found, footer, aria-labels, admin EN, uk-UA formatting)

## How to verify fixes

- E2E: `docker compose exec frontend npx playwright test`
- Lint/build: `npm run lint` / `npm run build` (in `frontend/`)
