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
npm run dev         # tsx watch src/index.ts (hot reload)
npm run build       # tsc
npm run start       # node dist/index.js
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run test:watch  # vitest watch mode
npm run migrate     # auth migrate --yes (DB schema via Better Auth CLI)
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
│   ├── twoFactorRoutes.ts         # 2FA enable/disable
│   └── usersRoutes.ts             # Admin user CRUD
├── validation/
│   └── schemas.ts                 # Zod schemas for all endpoints
└── __tests__/
    └── health.test.ts             # Placeholder tests (single health check)
```

**Note:** Controller/service layers were removed. Routes call Better Auth API directly.

### Key Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Deep health check (DB + Redis probes) |
| GET | `/auth/me` | Session | Returns current session/user (used by gateway auth_request) |
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
| POST | `/auth/admin/set-role` | Admin | Set user role (`admin`/`user`/`cashier`/`warehouse_worker`) |
| POST | `/auth/admin/sessions/revoke` | Admin | Revoke any session |
| ALL | `/auth/*` | Session | Catch-all: Better Auth built-in handlers |

### Role Schema
```typescript
role: z.enum(["admin", "user", "cashier", "warehouse_worker"])
```
See CONCERN.md §1 for the role-gating gap (gateway blocks non-admin writes).

### Route Order (index.ts)
1. `/health` → deep health check
2. `/auth/sign-in/email` → rate limiter intercept (before Better Auth)
3. `/auth/two-factor` → custom 2FA routes
4. `/auth/admin` → admin CRUD (`requireAdmin` middleware)
5. `/auth/sessions/revoke` → session revocation
6. `/auth/admin/sessions/revoke` → admin session revocation
7. `/auth/me` → session lookup (returns JSON + X-User-* response headers)
8. `/auth/*` → Better Auth catch-all handler
9. `/` → redirect to frontend

### Gateway Integration (Auth Headers)
`/auth/me` returns response headers alongside JSON body:
- `X-User-Id` — user UUID
- `X-User-Role` — role string
- `X-User-Email` — email
- `X-User-Name` — display name

Gateway injects these as `X-Gateway-User-*` headers to downstream Django services.

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Signing secret for tokens (`openssl rand -base64 32`) |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `FRONTEND_URL` | — | CORS origin (added to localhost defaults) |
| `ADMIN_USER_IDS` | — | Comma-separated user IDs with admin privileges |
| `BETTER_AUTH_URL` | `http://auth-service:3001/auth` | Better Auth base URL |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Winston log level |
| `ADMIN_EMAIL` | — | Email for auto-seeding first admin |
| `ADMIN_PASSWORD` | — | Password for auto-seeded admin |
| `ADMIN_NAME` | `Admin` | Display name for auto-seeded admin |

## Authentication Flow

### Session Verification (Gateway Integration)
1. Gateway makes internal `auth_request` to `/auth/me` with user cookies
2. Auth service returns session user (JSON) + `X-User-*` response headers
3. njs `checkAndProxy` evaluates role-based permissions
4. Gateway injects `X-Gateway-User-*` headers to downstream services
5. Django `GatewayAuthentication` trusts these headers (internal network only)

### Dual-Source Authorization (Known Concern)
- `requireAdmin` middleware checks `ADMIN_USER_IDS` env var (runtime whitelist)
- DB `role` column is used by gateway for per-route gating
- These are not synchronized — see CONCERN.md §3

### Brute-Force Protection
- **Redis-backed** with exponential backoff:
  - 5 failed attempts → 1 minute block
  - 10 → 5 minutes
  - 20 → 30 minutes
  - 50+ → 1 hour
- **Fail-closed:** if Redis is unavailable, sign-ins are blocked with 30s backoff

### Admin Bootstrapping
On first startup when `ADMIN_USER_IDS` is empty and `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set:
1. Check if `ADMIN_USER_IDS` has entries → skip
2. Look up `ADMIN_EMAIL` in DB — if user exists, add ID to admin list
3. If not: create user + account (scrypt-hashed password), add ID
4. Log user ID — **copy to `ADMIN_USER_IDS` in `.env`** for persistence

### Session Configuration
- Expiry: 7 days (`expiresIn`)
- Refresh window: 24 hours (`updateAge`)
- Cookie prefix: `better-auth`
- Cross-subdomain cookies enabled

## Security Features
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
- Migration files in `better-auth_migrations/` (auto-generated by CLI)

### Migrations
```bash
npm run migrate   # auth migrate --yes
```
In Docker, migrations run automatically on container start.

## OAuth Providers
- Google (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- GitHub (requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)

## Tests
- **Status:** Minimal — single health check test
- **Run:** `npm run test`
- **Gap:** No coverage for role CRUD, 2FA, OAuth flows, rate limiting, session management. See CONCERN.md §10.
