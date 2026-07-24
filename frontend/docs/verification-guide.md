# Design System Verification Guide

## 1. Build

```bash
npm run build
```

Expected: zero errors.

## 2. Lint

```bash
npm run lint
```

Expected: passes (pre-existing errors may remain in unrelated files).

## 3. Visual Regression

```bash
# First run (creates baselines):
npm run test:visual

# Subsequent runs:
npm run test tests/visual/homepage.spec.ts
```

Expected: screenshots match baselines.

## 4. Full E2E Suite

```bash
npm run test
```

Expected: all existing tests pass.

## 5. Dark/Light Audit

```bash
npx playwright test tests/visual/theme-audit.spec.ts
```

Then manually inspect `tests/visual/screenshots/` for contrast issues.

## 6. Hardcoded Color Check

```bash
npm run lint:colors
```

Expected: reports remaining hardcoded colors (badge statuses, amber warnings are intentionally excluded). Zero new instances.
