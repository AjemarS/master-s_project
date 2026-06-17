# Auth Service

- Express + Better Auth + TypeScript (see `package.json`, `tsconfig.json`). Port 3001.
- DB: PostgreSQL (`auth_db`). Redis for rate limiting.
- Env validation on startup: exits if `DATABASE_URL` or `BETTER_AUTH_SECRET` missing.
- Run: `npm run dev` (tsx watch). No test/lint scripts configured.
- Key routes: `/auth/*` (Better Auth handler), `/auth/me` (session lookup), `/auth/admin/*` (admin-only).
