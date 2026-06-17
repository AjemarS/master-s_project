# Auth Service

## Stack
- **Runtime:** Node.js 22 (Alpine in Docker)
- **Framework:** Express + TypeScript (tsx watch for dev, tsc for build)
- **Auth Library:** Better Auth v1.4.3
- **Database:** PostgreSQL 15 (`auth_db`, port 5433)
- **Cache:** Redis 7 (rate limiting via ioredis)
- **Logging:** Winston (colorized dev, JSON/production + file rotation)
- **Validation:** Zod v4 (request body validation)
- **Testing:** Vitest + Supertest

## Port
- Container: 3001 (default, configurable via `PORT`)
- Docker compose maps to 3001:3001

## Quick Start
```bash
npm run dev      # tsx watch src/index.ts (hot reload)
npm run build    # tsc
npm run start    # node dist/index.js
npm run typecheck # tsc --noEmit
npm run test     # vitest run
npm run test:watch # vitest watch mode
npm run migrate  # auth migrate --yes (create/update DB schema via Better Auth CLI)
```

## Architecture

### Directory Structure
```
src/
├── auth.ts                        # Better Auth instance + DB pool export
├── index.ts                       # Express server, routes, middleware, health check, graceful shutdown
├── logger.ts                      # Winston logger (dev/prod modes)
├── middleware/
│   ├── authMiddleware.ts          # requireAuth, requireAdmin middleware
│   ├── rateLimiter.ts             # Redis-backed brute-force protection
│   └── validate.ts                # Zod validation middleware factory
├── routes/
│   ├── twoFactorRoutes.ts         # 2FA enable/disable (merged, no controller/service)
│   └── usersRoutes.ts             # Admin user CRUD (merged, no controller/service)
├── validation/
│   └── schemas.ts                 # Zod schemas for all endpoints
└── __tests__/
    └── health.test.ts             # Placeholder tests
```

**Note:** Controller/service layers were removed. Routes call Better Auth API directly.

### Key Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Deep health check (DB + Redis probes) |
| GET | `/auth/me` | Session | Returns current session/user |
| POST | `/auth/sign-in/email` | None | Sign-in (intercepted by rate limiter) |
| POST | `/auth/two-factor/enable` | Session + password | Enable 2FA |
| POST | `/auth/two-factor/disable` | Session + password | Disable 2FA |
| POST | `/auth/sessions/revoke` | Session | Revoke own session |
| POST | `/auth/admin/users` | Admin | Create user |
| GET | `/auth/admin/users` | Admin | List users (`?search=&limit=&offset=`) |
| GET | `/auth/admin/users/:id` | Admin | Get user by ID |
| PUT | `/auth/admin/users/:id` | Admin | Update user |
| DELETE | `/auth/admin/users/:id` | Admin | Delete user |
| GET | `/auth/admin/users/:id/sessions` | Admin | List user sessions |
| POST | `/auth/admin/set-role` | Admin | Set user role (`admin`/`user`) |
| POST | `/auth/admin/sessions/revoke` | Admin | Revoke any session (by `sessionToken` or `userId`) |
| ALL | `/auth/*` | Session | Catch-all: Better Auth built-in handlers |

### Route Order (index.ts)
1. `/health` → deep health check
2. `/auth/sign-in/email` → rate limiter intercept (before Better Auth)
3. `/auth/two-factor` → custom 2FA routes
4. `/auth/admin` → admin CRUD (requireAdmin middleware)
5. `/auth/sessions/revoke` → session revocation
6. `/auth/admin/sessions/revoke` → admin session revocation
7. `/auth/me` → session lookup
8. `/auth/*` → Better Auth catch-all handler
9. `/` → redirect to frontend

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Signing secret for tokens (generate: `openssl rand -base64 32`) |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `FRONTEND_URL` | — | CORS origin (added to localhost defaults) |
| `ADMIN_USER_IDS` | — | Comma-separated user IDs with admin privileges |
| `BETTER_AUTH_URL` | `http://auth-service:3001/auth` | Better Auth base URL |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URL` | `http://localhost:3001/auth/callback/google` | Google OAuth redirect |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret |
| `GITHUB_REDIRECT_URL` | `http://localhost:3001/auth/callback/github` | GitHub OAuth redirect |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Winston log level |
| `ADMIN_EMAIL` | — | Email for auto-seeding first admin (used when `ADMIN_USER_IDS` is empty) |
| `ADMIN_PASSWORD` | — | Password for auto-seeded admin |
| `ADMIN_NAME` | `Admin` | Display name for auto-seeded admin |

### Secret Rotation
Real credentials must never be committed. Use `.env.example` (in git) as a template. Rotate exposed credentials:
- Google OAuth: revoke and recreate at https://console.cloud.google.com/apis/credentials
- GitHub OAuth: revoke and recreate at https://github.com/settings/developers
- `BETTER_AUTH_SECRET`: generate new with `openssl rand -base64 32`

## Authentication Flow

### Session Verification (Gateway Integration)
1. Gateway proxies requests from frontend
2. Gateway calls `GET /auth/me` with the user's cookies
3. Auth service returns session user or null
4. Gateway injects `X-Gateway-User-*` headers to downstream services
5. Product service trusts these headers via `GatewayAuthentication`

### Brute-Force Protection
- **Redis-backed** with exponential backoff:
  - 5 failed attempts → 1 minute block
  - 10 → 5 minutes
  - 20 → 30 minutes
  - 50+ → 1 hour
- **Fail-closed:** if Redis is unavailable, sign-ins are blocked with 30s backoff
- Success/failure detected via HTTP status code (200 = success, 401/403 = failure)

### Admin Bootstrapping (First Admin)

On first startup when `ADMIN_USER_IDS` is empty and `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set, the service auto-creates the first admin:

1. Check if `ADMIN_USER_IDS` already has entries → skip
2. Look up `ADMIN_EMAIL` in DB — if user exists, add their ID to the admin list
3. If user doesn't exist: create `user` + `account` records with scrypt-hashed password, add ID to admin list
4. Log the user ID — **copy it to `ADMIN_USER_IDS` in `.env`** for persistence across restarts

Without step 4, the admin access is lost after restart (the runtime list resets from env).

After bootstrapping, add subsequent admins via `POST /auth/admin/set-role` or by adding their user ID to `ADMIN_USER_IDS`.

### Admin Authorization
- `requireAdmin` middleware checks: `ADMIN_USER_IDS.includes(user.id)` (sole source of truth)
- DB `role` column is informative only (used in session responses for Gateway headers)
- Admin plugin in Better Auth also uses `ADMIN_USER_IDS` for its dashboard

### CSRF Protection
- State-changing methods (POST, PUT, PATCH, DELETE) require matching `Origin` or `Referer` header
- Allowed origins: `http://localhost`, `http://localhost:3000`, and `FRONTEND_URL`

### Session Configuration
- Expiry: 7 days (`expiresIn`)
- Refresh window: 24 hours (`updateAge`)
- Cookie prefix: `better-auth`
- Cross-subdomain cookies enabled

### Security Features
- [x] Brute-force protection (Redis, exponential backoff, fail-closed)
- [x] Admin authorization (ADMIN_USER_IDS whitelist)
- [x] Input validation (Zod schemas on all custom endpoints)
- [x] Session verification for 2FA (extracted from session, not request body)
- [x] CSRF protection (Origin/Referer validation)
- [x] Request tracing (X-Request-Id generation and propagation)
- [x] Graceful shutdown (SIGTERM/SIGINT → drain → close pool/redis → exit)
- [x] Deep health check (DB + Redis probes)
- [x] Audit logging (admin actions logged with actor, action, target, IP)
- [x] CORS from config (FRONTEND_URL + localhost fallbacks)
- [ ] Rate limiting on admin endpoints (planned)
- [ ] Email verification (disabled, can enable later)

## Database
- PostgreSQL schema managed by Better Auth CLI
- Tables: `user`, `session`, `account`, `verification`
- Custom `status` field on `user` table (default: `"active"`)
- Migration files in `better-auth_migrations/` (version-controlled, auto-generated by CLI)

### Migrations
Apply schema changes via the [Better Auth CLI](https://www.better-auth.com/docs/concepts/cli):

```bash
npm run migrate   # auth migrate --yes
```

This reads `src/auth.ts`, compares expected schema against the running database, and creates/alters tables as needed. Safe to run repeatedly (no-op when schema matches).

In Docker, migrations run automatically on container start via `command: sh -c "npm run migrate && npm run dev"` in `docker-compose.yaml`.

## OAuth Providers
- Google (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- GitHub (requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
- Both use configurable redirect URIs

## Session / Token Management
- Sessions stored in `session` table with IP address and user agent tracking
- Session tokens are opaque strings (Better Auth manages them)
- Owners can revoke their own sessions
- Admins can revoke any session (by token or all sessions for a user)

## 2FA (Two-Factor Authentication)
- TOTP-based (Better Auth twoFactor plugin)
- Requires authenticated session + password verification
- Enable: `POST /auth/two-factor/enable` (body: `{ password }`)
- Disable: `POST /auth/two-factor/disable` (body: `{ password }`)
- **Security note:** User identity is extracted from session, not request body
