# Auth Service — Capabilities

## 1. Authentication

### 1.1 Email/Password Sign-In
- **POST** `/auth/sign-in/email` — intercepts Better Auth sign-in with rate limiting
- Min password length: 8 characters
- Password hashing: scrypt (via Better Auth)

### 1.2 OAuth / Social Login
- **Google** — OAuth 2.0 via Better Auth social provider
- **GitHub** — OAuth 2.0 via Better Auth social provider
- OAuth callbacks handled by Better Auth catch-all at `/auth/*`
- Redirect URIs configurable via `GOOGLE_REDIRECT_URL`, `GITHUB_REDIRECT_URL`

### 1.3 Session Management
- Session expiry: 7 days (`expiresIn: 604800`)
- Session refresh window: 24 hours (`updateAge: 86400`)
- Cookie prefix: `better-auth`
- Cross-subdomain cookies enabled
- IP address captured from `x-forwarded-for`, `x-real-ip`, `x-client-ip`
- Redis read-through cache for `getSession` (24h TTL, invalidated on revoke)
- **User self-service:** `GET /auth/sessions` (list own sessions), `POST /auth/sessions/revoke` (revoke own session)

### 1.4 Email Verification
- Disabled by default (gated on `RESEND_API_KEY` presence)
- When enabled: sends verification email with 24-hour link
- Resend transactional email with HTML templates (Ukrainian locale)

### 1.5 Password Reset
- Sends reset password email with 1-hour link
- Resend transactional email with HTML templates (Ukrainian locale)

## 2. Authorization & Role-Based Access

### 2.1 Role Hierarchy
Four roles via Zod enum: `admin`, `user`, `cashier`, `warehouse_worker`

### 2.2 Admin Access Control
Single source of truth: `user.role` DB column.

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| **Gateway** | njs `checkAndProxy` evaluates `role` from `/auth/me` `X-User-Role` header | Per-route gating in nginx |
| **Service** | `requireAdmin` middleware checks `session.user.role` from DB | Admin API endpoints |

No env-var whitelist. The previous `ADMIN_USER_IDS` dual-source has been removed.

### 2.3 Admin API Endpoints
All scoped under `/auth/admin/` with `requireAdmin` middleware:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/admin/users` | List users (`?search=&limit=&offset=`) |
| GET | `/auth/admin/users/:id` | Get user by ID |
| POST | `/auth/admin/users` | Create user (email, password, name) |
| PUT | `/auth/admin/users/:id` | Update user (email, name, status) |
| DELETE | `/auth/admin/users/:id` | Remove user |
| GET | `/auth/admin/users/:id/sessions` | List user sessions |
| POST | `/auth/admin/set-role` | Set user role |
| POST | `/auth/admin/sessions/revoke` | Revoke any session (by token or all for user) |

### 2.4 Audit Logging
All admin actions written to PostgreSQL `audit_log` table via `writeAuditLog()` with retry (3 attempts on DB failure):

| Entry | Field |
|-------|-------|
| actor | Admin user ID |
| action | `createUser`, `updateUser`, `removeUser`, `setRole`, `revokeSession`, `impersonate`, `stopImpersonation` |
| target | Target user ID |
| IP | Request IP |
| metadata | Optional JSON blob |
| timestamp | `created_at` (indexed, sorted DESC) |

**Queriable via admin API:** `GET /auth/admin/audit-logs?action=&actorId=&limit=&offset=`

**Planned expansion:** Build a unified cross-service audit log consumer (RabbitMQ) so all services emit structured audit events to a single viewable stream in the frontend.

## 3. Two-Factor Authentication (2FA)

- TOTP-based via Better Auth `twoFactor` plugin
- **Enable**: `POST /auth/two-factor/enable` (requires session + password, optional issuer)
- **Disable**: `POST /auth/two-factor/disable` (requires session + password)
- Password must be re-entered for both enable and disable

## 4. Impersonation

### 4.1 Admin Direct Impersonation
- `POST /auth/admin/impersonate` — admin directly impersonates any user by userId
- `POST /auth/admin/stop-impersonation` — restores original session
- Forwards `Set-Cookie` headers for session token replacement
- Validates target user exists before impersonating

### 4.2 Cashier Code-Based Impersonation
- `POST /auth/impersonate/request-code` — cashier requests 6-digit code sent to user email
- `POST /auth/impersonate/verify-code` — verifies code and starts impersonation
- Code storage: Redis with in-memory Map fallback (5-minute TTL)
- Code sent via Resend email + logged to console for dev fallback

## 5. Security

### 5.1 Brute-Force Protection (Rate Limiting)
- **Redis-backed** with lazy connection
- Atomic Lua script for recording attempts (INCR + EXPIRE + threshold check + SETEX in single eval)
- 3-layer fallback: EVALSHA → EVAL → non-atomic INCR/EXPIRE/SETEX
- Exponential backoff per IP:

| Failed Attempts | Block Duration |
|-----------------|----------------|
| 5+ | 1 minute |
| 10+ | 5 minutes |
| 20+ | 30 minutes |
| 50+ | 1 hour |

- Window resets on successful login or block expiry
- **Fail-closed**: Redis unavailable → all sign-ins blocked with 30s retry-after

### 5.2 CSRF Protection
- Validates `Origin` or `Referer` header against CORS whitelist for mutating methods
- Only enforced when either header is present (allows programmatic clients)
- Returns 403 on mismatch with `{ success: false, message }` format

### 5.3 Password Policy
- Min 8 characters
- Must contain at least 1 uppercase letter
- Must contain at least 1 lowercase letter
- Must contain at least 1 digit
- Common password blocklist (15 most common passwords rejected)
- Enforced on `POST /auth/admin/users` via Zod

### 5.4 CORS
- Trusted origins: `http://localhost`, `http://localhost:3000`, plus `FRONTEND_URL` env var
- Credentials enabled for cookie-based auth

### 5.5 Request Tracing
- Each request gets `X-Request-Id` (reuses incoming or generates UUID)
- Propagated on response headers

### 5.5 Input Validation
- Zod schemas for all custom endpoints
- Validation errors return 400 with field-level error details

## 6. Infrastructure

### 6.1 Health Check
- **GET** `/health` — deep probe of both dependencies
```json
{ "status": "healthy", "service": "auth-service", "checks": { "database": "ok", "redis": "ok" }, "uptime": 123.45 }
```
- Returns 200 if both DB and Redis healthy
- Returns 503 if either dependency degraded

### 6.2 Database
- PostgreSQL via `pg` Pool
- Better Auth-managed schema: `user`, `session`, `account`, `verification`
- Custom `status` field on `user` (default: `"active"`)

### 6.3 Redis
- Used for: rate limiting attempt counters + block keys, impersonation code storage
- Lazy connect, 3 max retries

### 6.4 Logging
- Winston with colorized dev format / structured JSON in production
- File rotation in production (error.log, combined.log)
- Log level configurable via `LOG_LEVEL`

### 6.5 Graceful Shutdown
- SIGTERM/SIGINT → close HTTP server → drain DB pool → quit Redis → exit
- 30-second forced shutdown timeout

## 7. Developer Experience

### 7.1 Admin Bootstrapping
On first start (when `ADMIN_USER_IDS` empty):
1. Looks up `ADMIN_EMAIL` in DB
2. If exists: promotes to admin, sets `emailVerified=true`
3. If not: creates user + credential account, seeds as admin
4. Logs warning with user ID to copy to `ADMIN_USER_IDS`

### 7.2 Dev User Seeding
Creates 3 development users with password `password123`:
| Name | Email | Role |
|------|-------|------|
| Cashier | cashier@techhub.local | cashier |
| Warehouse Worker | warehouse@techhub.local | warehouse_worker |
| Customer | customer@techhub.local | user |

### 7.3 Environment Configuration
- **Required**: `DATABASE_URL`, `BETTER_AUTH_SECRET`
- **Optional**: 15+ configurable env vars (OAuth keys, Redis, email, admin seeds, CORS)
- `.env.example` documents all variables with defaults
- Validation on startup with clear error/warning messages

## 8. Test Coverage

### 8.1 Unit Tests (Vitest)
- **Schema validation** — 32 tests covering createUser, updateUser, set-role, 2FA schemas, password policy (uppercase, lowercase, digit, common blocklist)
- **Auth middleware** — 8 tests covering requireAuth/requireAdmin (200/401/403/500)
- **Rate limiter** — 12 tests covering login backoff thresholds, Lua eval path, non-atomic fallback, admin rate limit
- **Email sender** — 2 tests covering Resend-not-configured fallback

### 8.2 Integration Tests (Vitest + Supertest)
- **Health check** — 5 tests (DB/Redis state combinations)
- **2FA routes** — 8 tests (enable/disable, auth failure, validation errors, API errors)
- **User admin CRUD** — 22 tests (list/get/create/update/delete, set-role, sessions, validation, audit log pagination + filtering)
- **Impersonation** — 13 tests (admin impersonate, stop, cashier request/verify code, expiry, errors)
- **Session info + CORS** — 9 tests (authenticated X-User-* headers, unauthenticated, default role, session listing, CORS disallowed/allowed origin, programmatic client)
- **Sign-in + session revoke** — 8 tests (rate limiter allow/block/fail-closed, own session revoke, admin session revoke single + bulk)
- **Total**: 119 tests, all passing

## 9. Admin Rate Limiting

- Separate rate limit window for admin API endpoints (see §5.1 for sign-in rate limiting)
- Limit: 30 req/min for GET, 10 req/min for mutating operations
- Keyed by `userId + IP` to prevent single-user abuse across IPs
- **Fail-open**: if Redis is unavailable, admin requests proceed without rate limiting
- Covers: user CRUD, set-role, session revocation, admin impersonation

## 10. Gateway Integration

- `/auth/me` sets response headers consumed by Nginx njs `auth_request`:
  - `X-User-Id` → `X-Gateway-User-Id`
  - `X-User-Role` → `X-Gateway-User-Role`
  - `X-User-Email` → `X-Gateway-User-Email`
  - `X-User-Name` → `X-Gateway-User-Name`
- Gateway evaluates role permissions before proxying to downstream services
