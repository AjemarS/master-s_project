# Playwright run — 2026-10-17

Full suite (`npx playwright test`), Playwright 1.61.0 (`mcr.microsoft.com/playwright:v1.61.0-noble`),
against the local `docker compose` stack (`next dev`), chromium + firefox, 2 workers, routes warmed up first.
No `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`, so the authenticated admin project was skipped.
The HTML report is generated in `frontend/playwright-report/` (git-ignored).

| | Tests |
|---|---|
| Passed | 73 |
| Failed | 34 (17 tests × 2 browsers; the same in both, i.e. deterministic) |
| Skipped | 15 (`admin.spec.ts`, needs admin credentials) |

A first, cold run (default workers) gave 66 / 41 / 15: the extra 7 failures were `page.goto` timeouts
while `next dev` compiled routes on first request.

## Failures by cause

**Visual baselines out of date — 9 tests** (`toHaveScreenshot` diff against the committed `*-linux.png`):
`visual/homepage.spec.ts` (full page, hero), `visual/admin-summary.spec.ts`,
`visual/theme-audit.spec.ts` (light/dark × homepage, products, admin-summary).
Update with `npx playwright test tests/visual --update-snapshots` after reviewing the diffs in the report.

**Assertions behind the current UI — 8 tests:**

| Test | Expects | Actual |
|---|---|---|
| `auth` › sign up link navigates to /sign-up; `auth` › sign-up form renders; `navigation` › sign-up accessible without auth | `#name` field on sign-up | the form has no name field (email, password, repeat password) |
| `auth` › form shows validation with empty submission | clickable submit within 30 s | click times out |
| `navigation` › header logo links to home; `products` › logo navigates home | URL `/` | locale-prefixed URL (`/ua`, `/en`) |
| `navigation` › products nav link | URL matching `/products/` | link target differs |
| `products` › renders the page heading | heading "Товари" | the products page has no such heading |

None of these tests cover the checkout, product filters or sign-up consent changed in this round.

## UX fixes in this round (IDs from the UX review, since resolved and removed), before → after

| ID | Before | After |
|---|---|---|
| C1 | After the order was created and the Stripe session opened, a modal (SaveDialog / GuestPrompt) blocked the redirect to payment | The browser goes straight to Stripe; logged-in users tick "save name/phone/address" inline next to the order summary before paying |
| C2 | GuestPrompt was a plain `div` overlay: no `role="dialog"`, focus trap or Escape | Removed: there is no modal left in the checkout flow |
| H1 | Filters, sort and page were local state; Back lost them and links were not shareable | All of them live in the URL (`?category=…&brand=…&inStock=1&sort=…&page=…`); Back restores the previous filter set; the price slider uses `replace` so dragging does not flood history |
| H6 | Marketing consent pre-checked on sign-up | Unchecked by default (opt-in) |
