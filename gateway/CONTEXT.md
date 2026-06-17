# Gateway

- FastAPI single-file proxy (see `requirements.txt`). Port 80 (internal 8080).
- Run: `uvicorn main:app --host 0.0.0.0 --port 8080`. No tests/lint.
- Route order (first-match): `/api/*` → product, `/media/*` → product, `/auth/*` → auth, `/*` → frontend.
- Auth: `verify_session()` calls auth-service `/auth/me`, injects `X-Gateway-User-*` headers downstream.
