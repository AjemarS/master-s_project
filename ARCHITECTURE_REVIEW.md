# Architecture Review — Microservices Project

> Date: 2026-06-17
> Reviewer: Automated static analysis

---

## 1. GATEWAY — Route Ordering / Dead Code

**File:** `gateway/main.py`

### 1.1 `/auth/me` never matched by its own handler

```python
# Line 285 — catch-all defined FIRST
@app.api_route("/auth/{path:path}", methods=["GET", "POST", ...])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, AUTH_SERVICE_URL, f"/auth/{path}")

# Line 290 — explicit route defined AFTER catch-all (DEAD CODE)
@app.get("/auth/me")
async def proxy_auth_me(request: Request):
    return await proxy_request(request, AUTH_SERVICE_URL, "/auth/me")
```

**Problem:** FastAPI matches the catch-all `/auth/{path:path}` first for any `/auth/me` GET request. The explicit `/auth/me` handler on line 290 is **never invoked**. While proxying still happens to the correct URL, the dedicated handler is dead code — misleading to developers.

**Impact:** Low. Works functionally because the catch-all proxies the same endpoint. But anyone adding logic to the explicit handler would be confused when it never executes.

---

## 2. PRODUCT SERVICE — Cart Security Bypass

**Files:** `product-service/products/cart_views.py`, `product-service/products/authentication.py`

### 2.1 CartViewSet reads user_id from raw headers, bypassing DRF auth

The rest of product-service uses proper DRF authentication via `GatewayAuthentication` (which reads `X-Gateway-User-Id` through Django's `request.META`). But `CartViewSet` reads the header **directly**:

```python
# cart_views.py line 14
def get_queryset(self):
    user_id = self.request.headers.get("X-Gateway-User-Id")  # ← RAW HEADER
    ...
```

**Problems:**
- **No permission classes defined** on `CartViewSet`. It relies on the global `IsAuthenticatedOrReadOnly`, but since authentication is bypassed, unauthenticated requests proceed anyway (just get empty cart).
- **Bypass attack:** If anyone connects **directly** to the product-service (port 8000) without going through the gateway, they can set **any** `X-Gateway-User-Id` header and access **any** user's cart.
- **Inconsistency:** Products/categories use `request.user` set by `GatewayAuthentication`; cart uses raw headers.

**Fix:** Use `self.request.user.id` from DRF's authenticated user instead of reading headers directly.

### 2.2 CartViewSet.clear() — AttributeError bug

```python
# cart_views.py line 109
cart.objects.all().delete()  # ← BUG: 'cart' is a Cart instance, not a model class
```

Should be:

```python
CartItem.objects.filter(cart=cart).delete()
```

Calling this endpoint would raise `AttributeError: 'Cart' object has no attribute 'objects'` — but only if the function is reached (it requires authentication first).

---

## 3. PRODUCT SERVICE — CSRF Trusted Origins Misconfiguration

**File:** `product-service/product_service/settings.py`, line 173

```python
CORS_ALLOWED_ORIGINS = [...]
CSRF_TRUSTED_ORIGINS = [x.strip() for x in os.environ.get(
    "CORS_ALLOWED_ORIGINS",    # ← READS THE WRONG ENV VAR
    "http://localhost"
).split(",")]
```

**Problem:** `CSRF_TRUSTED_ORIGINS` reads from `CORS_ALLOWED_ORIGINS` env var instead of a dedicated `CSRF_TRUSTED_ORIGINS` env var. This means:
- You cannot configure CSRF trusted origins independently from CORS origins.
- If the CORS list is ever locked down (e.g., removing `http://localhost` in production), CSRF validation may break for legitimate requests.

---

## 4. AUTH SERVICE — Rate Limiter Fail-Open

**File:** `auth-service/src/index.ts`

### 4.1 Brute-force protection silently degrades

```typescript
// Line 80-83
try {
    const result = await checkLoginRateLimit(ip);
    allowed = result.allowed;
} catch (err) {
    allowed = true;  // ← FAIL-OPEN: rate limiter unavailable → request allowed
}
```

If Redis goes down (or connection fails), the rate limiter catches the error and **allows all requests through**. While fail-open prevents a denial-of-service from a rate-limiter crash, it means brute-force protection disappears silently — only a `warn` log is emitted at startup (line 181-183).

**Impact:** Medium. An attacker who knows this could take down Redis (e.g., by filling memory) and then brute-force passwords without restriction.

---

## 5. AUTH SERVICE — Login Rate Limiter Interceptor Override

**File:** `auth-service/src/index.ts`

### 5.1 `res.end` / `res.json` monkey-patching

The rate limiter intercepts sign-in responses by overriding `res.end` and `res.json` (lines 96-122). This is fragile:
- Overrides Express internals, which could break with middleware reordering or Express version updates.
- The `res.json` override on line 115 is redundant with the `res.end` override (Express calls `end` after `json`). Both blocks parse the response body.
- `res.end` override tries `JSON.parse(Buffer.isBuffer(chunk) ? ...)` — but `res.end` may receive a string, not a buffer. The `String(chunk)` fallback is used, but the logic is fragile.

**Recommendation:** Use a proper response interceptor pattern (`onFinished` npm package) instead of monkey-patching.

---

## 6. ROUTE CLASH — Catch-All Gateway Routes

**File:** `gateway/main.py`

### 6.1 `/api/{path:path}` and `/{path:path}` are very broad

The gateway has these catch-all routes in order:

| Order | Route | Methods | Target |
|-------|-------|---------|--------|
| 1 | `/api/{path:path}` | GET,POST,PUT,PATCH,DELETE | Product Service |
| 2 | `/media/{path:path}` | GET | Product Service (media) |
| 3 | `/auth/{path:path}` | all | Auth Service |
| 4 | `/{path:path}` | GET | Frontend (with exclusion for api/, auth/, media/) |

**Potential issue:** If any new route is added that starts with `api/`, `auth/`, or `media/` but targets a DIFFERENT backend service, it would silently route to the wrong service. The architecture is rigidly coupled to URL prefix routing.

**Impact:** Low for current scope, but limits extensibility without modifying the gateway.

---

## 7. MISSING ENVIRONMENT VARIABLE VALIDATION

**File:** `gateway/main.py`

No validation that required env vars (`PRODUCT_SERVICE_URL`, `AUTH_SERVICE_URL`, `CORS_ORIGINS`) are set. The auth-service has proper validation (lines 19-47 of `index.ts`), but the gateway does not. If `PRODUCT_SERVICE_URL` is empty, the gateway defaults to `"http://product-service:8000"` (the default), but if it's explicitly set to empty string or wrong value, there's no warning.

---

## 8. NO REQUEST VALIDATION IN GATEWAY

**File:** `gateway/main.py`

The gateway uses FastAPI but defines no Pydantic models for request/response validation for its proxy routes. All routes accept arbitrary bodies and forward them blindly. This means:
- No input validation at the edge.
- Malformed requests pass through to backend services.
- No content-type enforcement (though `Content-Type: application/json` is stripped by hop-by-hop header removal).

---

## 9. REDIS EXPOSED TO NETWORK

**File:** `docker-compose.yaml`, line 150-151

```yaml
redis:
    ports:
      - "6379:6379"
```

Redis is exposed to the host network without authentication. Default Redis has no auth, so anyone on the host network can connect to Redis and potentially:
- Read rate limit state
- Fill Redis memory (DoS)
- Use Redis for further attacks

**Fix:** Remove `ports` exposure from Redis (it only needs to be accessible within the Docker network), or add `--requirepass` configuration.

---

## 10. DOCKER COMPOSE — No Restart Policy

**File:** `docker-compose.yaml`

No service has a `restart:` policy defined. This means if any container crashes (e.g., `auth-service` has a fatal env validation error and calls `process.exit(1)`), Docker will NOT restart it. In production, this could cause cascading failures.

---

## Summary by Severity

| # | Issue | Severity | Service |
|---|-------|----------|---------|
| 2.2 | `CartViewSet.clear()` calls `cart.objects.all().delete()` — AttributeError | **High** (runtime crash) | Product |
| 2.1 | Cart bypasses DRF auth — reads raw headers directly | **High** (auth bypass) | Product |
| 3 | `CSRF_TRUSTED_ORIGINS` reads wrong env var | **Medium** (config error) | Product |
| 4 | Rate limiter fail-open on Redis failure | **Medium** (security) | Auth |
| 5 | Express monkey-patching for rate limit tracking | **Medium** (fragile) | Auth |
| 9 | Redis exposed without auth | **Medium** (security) | Infra |
| 1.1 | `/auth/me` handler is dead code | **Low** (misleading) | Gateway |
| 7 | No env validation in gateway | **Low** (resilience) | Gateway |
| 8 | No request validation at edge | **Low** (defense) | Gateway |
| 10 | No restart policy for containers | **Low** (resilience) | Infra |

---

## Architecture Diagram

```
Browser ──► Gateway (FastAPI :80)
                │
                ├──► /api/* ──────────► Product Service (Django :8000)
                │                          ├── products/categories (DRF auth via GatewayAuthentication)
                │                          └── cart (raw header auth — ⚠️ bypass)
                │
                ├──► /auth/* ─────────► Auth Service (Express :3001)
                │                          ├── Better Auth (sign-in, sign-up, sessions)
                │                          └── Custom rate limiter (Redis)
                │
                └──► /* ──────────────► Frontend (Next.js :3000)
```

**Authentication flow (intended):**
1. Browser → Gateway (cookie) → Gateway verifies session via `auth-service /auth/me`
2. Gateway → Product Service (internal headers `X-Gateway-User-*`)
3. Product Service → `GatewayAuthentication` reads headers → creates/updates Django User → DRF permissions work

**Authentication flow (broken for cart):**
1. Browser → Gateway → Product Service (internal headers)
2. CartViewSet → **reads raw HTTP headers directly** → never calls DRF auth → no permission check