# Visual Regression Testing

## Setup

First run — create baselines:

```bash
npm run test:visual
```

Subsequent runs — compare against baselines:

```bash
npm run test
```

## Theme Audit

Generate dark/light screenshots for manual review:

```bash
npx playwright test tests/visual/theme-audit.spec.ts
```

Screenshots saved to `tests/visual/screenshots/`.

## Notes

- Visual tests require a running dev server (Playwright auto-starts one via `webServer` config)
- Admin visual tests require `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` env vars
- Port 3000 may be occupied by Docker — set `PLAYWRIGHT_BASE_URL=http://localhost:3002` to override
- Animated elements (FadeIn, hero stagger) use `waitForTimeout(1000)` to settle before capture
