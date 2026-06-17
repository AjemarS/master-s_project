# Frontend

- Next.js 16 + React 19 + Tailwind CSS v4 (see `package.json`). Port 3000.
- Path alias: `~/*` → `./app/*`. UI: shadcn/ui + Radix + Framer Motion.
- Run: `npm run dev`. Lint: `npm run lint`. Test: `npx playwright test`.
- Auth middleware: `proxy.ts` protects `/dashboard/*` and `/admin/*` (verifies session via auth-service).
