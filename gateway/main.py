import asyncio
import logging
import os
from contextlib import asynccontextmanager

import httpx
import websockets
from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect

# ================================
#           ЛОГУВАННЯ
# ================================
from pythonjsonlogger import jsonlogger

log_handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log_handler.setFormatter(formatter)

logger = logging.getLogger("gateway")
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())
logger.addHandler(log_handler)
logger.propagate = False


# ================================
#      CONFIG FROM ENV
# ================================
PRODUCT_SERVICE_URL = os.environ.get(
    "PRODUCT_SERVICE_URL", "http://product-service:8000"
)
INVENTORY_SERVICE_URL = os.environ.get(
    "INVENTORY_SERVICE_URL", "http://inventory-service:8001"
)
ORDER_SERVICE_URL = os.environ.get(
    "ORDER_SERVICE_URL", "http://order-service:8002"
)
AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:3001")
FRONTEND_SERVICE_URL = os.environ.get("FRONTEND_SERVICE_URL", "http://frontend:3000")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost").split(",")


# ================================
#      ENVIRONMENT VALIDATION
# ================================
def validate_env():
    """
    Validates that required environment variables are set.
    Called at startup to fail early if configuration is missing.
    """
    required_vars = {
        "PRODUCT_SERVICE_URL": PRODUCT_SERVICE_URL,
        "INVENTORY_SERVICE_URL": INVENTORY_SERVICE_URL,
        "ORDER_SERVICE_URL": ORDER_SERVICE_URL,
        "AUTH_SERVICE_URL": AUTH_SERVICE_URL,
        "FRONTEND_SERVICE_URL": FRONTEND_SERVICE_URL,
    }
    missing = [key for key, value in required_vars.items() if not value]
    if missing:
        logger.error("FATAL: Missing required environment variables", {"missing": missing})
        raise SystemExit(1)


validate_env()


# ================================
#            LIFESPAN
# ================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. створюємо httpx клієнт тільки один раз
    app.state.client = httpx.AsyncClient(timeout=30.0, http2=True)
    yield
    # 2. закриваємо при зупинці
    await app.state.client.aclose()


app = FastAPI(
    title="API Gateway",
    version="2.0.0",
    lifespan=lifespan,
)


# ================================
#            CORS
# ================================
@app.middleware("http")
async def secure_cors_and_options_middleware(request: Request, call_next):
    origin = request.headers.get("origin")

    # 1. ОБРОБКА PREFLIGHT (OPTIONS) ЗАПИТІВ
    if request.method == "OPTIONS":
        response = Response(status_code=204)  # 204 No Content

        # Перевіряємо, чи origin є у нашому білому списку (.env)
        if origin in CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"

            # Динамічно дозволяємо методи та заголовки, які просить фронтенд
            requested_method = request.headers.get("access-control-request-method", "*")
            requested_headers = request.headers.get("access-control-request-headers", "*")

            response.headers["Access-Control-Allow-Methods"] = requested_method
            response.headers["Access-Control-Allow-Headers"] = requested_headers

            # Кешуємо preflight на 10 хвилин, щоб браузер не спамив Gateway перед кожним запитом
            response.headers["Access-Control-Max-Age"] = "600"

        return response

    # 2. ОБРОБКА ВСІХ ІНШИХ ЗАПИТІВ (GET, POST, etc.)
    response = await call_next(request)

    # Додаємо CORS заголовки до фінальної відповіді, якщо Origin валідний
    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response


# ================================
#     AUTH VERIFICATION HELPERS
# ================================

async def verify_session(request: Request) -> dict | None:
    """
    Перевіряє сесію користувача через auth-service.
    Повертає user dict або None, якщо не автентифікований.
    """
    client: httpx.AsyncClient = request.app.state.client
    cookie_header = request.headers.get("cookie", "")

    if not cookie_header:
        return None

    try:
        auth_response = await client.get(
            f"{AUTH_SERVICE_URL}/auth/me",
            headers={"cookie": cookie_header},
            timeout=5.0,
        )
        if auth_response.status_code == 200:
            data = auth_response.json()
            return data.get("user") if data else None
        return None
    except Exception as e:
        logger.warning(f"Session verification failed: {e}")
        return None


async def require_auth(request: Request, allowed_roles: list[str] | None = None):
    """
    Verifies authentication and optional role check.
    If allowed_roles is None, any authenticated user passes.
    If allowed_roles is provided, admin always passes, other users must match the list.
    """
    user = await verify_session(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if allowed_roles is not None:
        role = user.get("role", "user")
        if role != "admin" and role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied")
    return user


# ================================
#       UNIVERSAL PROXY
# ================================
async def proxy_request(request: Request, target: str, path: str = "", user: dict | None = None):
    client: httpx.AsyncClient = request.app.state.client

    if not path:
        path = request.url.path
    url = f"{target}{path}"
    logger.debug("Proxying %s %s -> %s", request.method, request.url.path, url)

    # Отримуємо заголовки від фронтенду
    headers = dict(request.headers)

    # 1. КРИТИЧНО: Видаляємо hop-by-hop заголовки, які не можна проксувати
    #    (transfer-encoding, connection, keep-alive, etc.)
    #    Також видаляємо content-encoding, бо тіло вже декодоване Starlette
    hop_by_hop = {
        "host", "transfer-encoding", "connection", "keep-alive",
        "te", "trailer", "upgrade", "proxy-authorization",
        "proxy-authenticate", "content-encoding",
    }
    for header in hop_by_hop:
        headers.pop(header, None)

    # 2. ДОДАЄМО ЗАГОЛОВКИ АВТЕНТИФІКАЦІЇ ДЛЯ БЕКЕНД-СЕРВІСІВ
    # Gateway перевіряє сесію через Better Auth і передає перевірені дані
    # внутрішнім сервісам через захищені заголовки.
    # Це вирішує проблему несумісності Better Auth з Django/Basic auth.
    if user:
        headers["X-Gateway-User-Id"] = user.get("id", "")
        headers["X-Gateway-User-Role"] = user.get("role", "user")
        headers["X-Gateway-User-Email"] = user.get("email", "")
        headers["X-Gateway-User-Name"] = user.get("name", "")

    # Отримання body для POST/PUT/PATCH запитів
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()

    # Отримання query parameters
    params = dict(request.query_params)
    logger.info(f"Proxying {request.method} {url} (user={user.get('id') if user else 'anonymous'})")

    try:
        # Виконуємо запит до внутрішнього мікросервісу
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            params=params,
            follow_redirects=True,
        )

        # Копіюємо заголовки, які повернув мікросервіс (Django / Auth)
        response_headers = dict(response.headers)

        # Очищення службових заголовків, які HTTPX/FastAPI мають розрахувати самі
        response_headers.pop("content-encoding", None)
        response_headers.pop("content-length", None)
        response_headers.pop("transfer-encoding", None)
        response_headers.pop("connection", None)

        # Видаляємо CORS-заголовки бекенду (Gateway сам виставить правильні)
        response_headers.pop("access-control-allow-origin", None)
        response_headers.pop("access-control-allow-credentials", None)
        response_headers.pop("access-control-allow-methods", None)
        response_headers.pop("access-control-allow-headers", None)

        # Повертаємо чисту відповідь. Глобальний Middleware сам перехопить її
        # і додасть правильний Access-Control-Allow-Origin для фронтенду.
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get("content-type"),
        )

    except httpx.TimeoutException:
        raise HTTPException(504, "Gateway Timeout") from None
    except httpx.RequestError as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(502, "Bad Gateway") from e

# ================================
#            ROUTES
# ================================
#
# IMPORTANT: Route ordering matters! FastAPI matches routes in declaration order.
# More specific routes MUST be declared before catch-all routes.
# Current routing table:
#   1. / (root)
#   2. /gateway
#   3. /health
#   4. /api/inventory/{path}   → Inventory Service
#   5. /api/orders/{path}      → Order Service
#   6. /api/reports/{path}     → Order Service (reports)
#   7. /api/{path:path}        → Product Service
#   8. /media/{path:path}      → Product Service (media files)
#   9. /auth/{path:path}       → Auth Service
#  10. /{path:path}            → Frontend


@app.get("/")
async def root(request: Request):
    return await proxy_request(request, FRONTEND_SERVICE_URL, "/")

@app.get("/gateway")
async def gateway_check():
    return  {"message": "API Gateway is running."}

@app.get("/health")
async def health():
    """Перевірка стану сервісів"""
    client = app.state.client

    async def check(url: str):
        try:
            r = await client.get(url, timeout=5)
            return {"status": "healthy" if r.status_code == 200 else "unhealthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    RABBITMQ_MGMT_URL = "http://rabbitmq:15672"

    return {
        "gateway": "healthy",
        "services": {
            "product": await check(f"{PRODUCT_SERVICE_URL}/api/products/"),
            "inventory": await check(f"{INVENTORY_SERVICE_URL}/api/warehouses/"),
            "order": await check(f"{ORDER_SERVICE_URL}/api/orders/"),
            "auth": await check(f"{AUTH_SERVICE_URL}/health"),
            "frontend": await check(f"{FRONTEND_SERVICE_URL}/favicon.ico"),
            "rabbitmq": await check(RABBITMQ_MGMT_URL),
        },
    }


# Inventory (MUST be before /api/{path:path} catch-all)
@app.api_route("/api/inventory/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_inventory(request: Request, path: str):
    target_path = f"/api/{path}"
    user = None
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        user = await verify_session(request)
        return await proxy_request(request, INVENTORY_SERVICE_URL, target_path, user=user)
    # Warehouse worker can manage goods receipts, transfers, and adjustments
    if any(path.startswith(p) for p in ("goods-receipts/", "stock/transfer/", "stock/adjust/")):
        user = await require_auth(request, allowed_roles=["warehouse_worker"])
    else:
        user = await require_auth(request, allowed_roles=["admin"])
    return await proxy_request(request, INVENTORY_SERVICE_URL, target_path, user=user)


# Orders (MUST be before /api/{path:path} catch-all)
@app.api_route("/api/orders/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_orders(request: Request, path: str):
    target_path = f"/api/orders/{path}" if path else "/api/orders/"
    user = None
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        user = await verify_session(request)
        return await proxy_request(request, ORDER_SERVICE_URL, target_path, user=user)
    # Online checkout: any authenticated user
    if not path:
        user = await require_auth(request)
    # POS sale: cashier or admin
    elif path.startswith("pos/"):
        user = await require_auth(request, allowed_roles=["cashier"])
    # Everything else (status changes, etc.): admin only
    else:
        user = await require_auth(request, allowed_roles=["admin"])
    return await proxy_request(request, ORDER_SERVICE_URL, target_path, user=user)


# Reports (MUST be before /api/{path:path} catch-all)
@app.api_route("/api/reports/{path:path}", methods=["GET"])
async def proxy_reports(request: Request, path: str):
    target_path = f"/api/reports/{path}"
    user = await require_auth(request, allowed_roles=["admin"])
    return await proxy_request(request, ORDER_SERVICE_URL, target_path, user=user)


# Products
# Public read access, authenticated write access
# Only admin users can create/update/delete products
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_products(request: Request, path: str):
    # Read operations are public (but still pass user info if available)
    user = None
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        user = await verify_session(request)
        return await proxy_request(request, PRODUCT_SERVICE_URL, f"/api/{path}", user=user)

    # Write operations require authentication + admin role
    # This protects the entire product CRUD API from unauthorized modifications
    user = await require_auth(request, allowed_roles=["admin"])

    return await proxy_request(request, PRODUCT_SERVICE_URL, f"/api/{path}", user=user)


@app.api_route("/media/{path:path}", methods=["GET"])
async def proxy_media(request: Request, path: str):
    return await proxy_request(
        request, target="http://product-service:8000", path=f"/media/{path}"
    )


# Auth Service — catch-all proxy for all /auth/* paths
# NOTE: /auth/me is handled by this catch-all via the auth-service's own route.
# Do NOT add a separate /auth/me route here — it would be dead code since
# FastAPI matches the catch-all first.
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, AUTH_SERVICE_URL, f"/auth/{path}")


# Frontend — must be declared LAST to avoid intercepting api/, auth/, media/ routes
@app.api_route("/{path:path}", methods=["GET"])
async def proxy_frontend(request: Request, path: str):
    # avoid conflicts
    if path.startswith(("api/", "auth/", "media/")):
        raise HTTPException(404, detail="Not Found")

    return await proxy_request(request, FRONTEND_SERVICE_URL, f"/{path}")


# ================================
#     Для WebSocket'ів Next.js
# ================================


@app.websocket("/_next/webpack-hmr")
async def websocket_proxy(ws: WebSocket):
    await ws.accept()

    backend_ws_url = FRONTEND_SERVICE_URL.replace("http", "ws") + "/_next/webpack-hmr"

    try:
        async with websockets.connect(backend_ws_url) as backend_ws:

            async def client_to_backend():
                try:
                    while True:
                        msg = await ws.receive_text()
                        await backend_ws.send(msg)
                except WebSocketDisconnect:
                    await backend_ws.close()

            async def backend_to_client():
                try:
                    while True:
                        msg = await backend_ws.recv()
                        await ws.send_text(msg)
                except Exception:
                    await ws.close()

            await asyncio.gather(client_to_backend(), backend_to_client())

    except Exception:
        await ws.close()
