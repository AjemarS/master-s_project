from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import os
import logging
import json

# ================================
#           ЛОГУВАННЯ
# ================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gateway")


# ================================
#      CONFIG FROM ENV
# ================================
PRODUCT_SERVICE_URL = os.environ.get(
    "PRODUCT_SERVICE_URL", "http://product-service:8000"
)
AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:3001")
FRONTEND_SERVICE_URL = os.environ.get("FRONTEND_SERVICE_URL", "http://frontend:3000")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost").split(",")


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


async def require_auth(request: Request, require_admin: bool = False):
    """
    Middleware helper: перевіряє автентифікацію та опціонально роль admin.
    Кидає HTTPException при невдачі.
    """
    user = await verify_session(request)
    
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if require_admin and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


# ================================
#       UNIVERSAL PROXY
# ================================
async def proxy_request(request: Request, target: str, path: str = ""):
    client: httpx.AsyncClient = request.app.state.client

    # Формування кінцевої URL-адреси мікросервісу
    url = f"{target}{path}"

    # Отримуємо заголовки від фронтенду
    headers = dict(request.headers)
    
    # 1. КРИТИЧНО ДЛЯ DJANGO: Видаляємо заголовок Host.
    # HTTPX сам підставить правильний Host (наприклад, product-service:8000),
    # завдяки чому Django не буде лаятися на ALLOWED_HOSTS.
    headers.pop("host", None)

    # Отримання body для POST/PUT/PATCH запитів
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()

    # Отримання query parameters
    params = dict(request.query_params)
    logger.info(f"Proxying {request.method} {url}")

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

        # 2. ОЧИЩЕННЯ ЗАГОЛОВКІВ БЕКЕНДУ
        # Видаляємо службові заголовки, які HTTPX/FastAPI мають розрахувати самі
        response_headers.pop("content-encoding", None)
        response_headers.pop("content-length", None)
        
        # 3. ВИДАЛЯЄМО СЛУЖБОВІ CORS ЗАГОЛОВКИ БЕКЕНДУ (якщо вони там є)
        # Це гарантує, що якщо Django чи Auth-service випадково викинуть свої
        # CORS-заголовки, вони не завадять нашому Middleware виставити правильні.
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
        raise HTTPException(504, "Gateway Timeout")
    except httpx.RequestError as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(502, "Bad Gateway")

# ================================
#            ROUTES
# ================================


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

    return {
        "gateway": "healthy",
        "services": {
            "product": await check(f"{PRODUCT_SERVICE_URL}/api/products/"),
            "auth": await check(f"{AUTH_SERVICE_URL}/health"),
            "frontend": await check(f"{FRONTEND_SERVICE_URL}/favicon.ico"),
        },
    }


# Products
# Public read access, authenticated write access
# Only admin users can create/update/delete products
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_products(request: Request, path: str):
    # Read operations are public
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return await proxy_request(request, PRODUCT_SERVICE_URL, f"/api/{path}")

    # Write operations require authentication + admin role
    # This protects the entire product CRUD API from unauthorized modifications
    await require_auth(request, require_admin=True)

    return await proxy_request(request, PRODUCT_SERVICE_URL, f"/api/{path}")


@app.api_route("/media/{path:path}", methods=["GET"])
async def proxy_media(request: Request, path: str):
    return await proxy_request(request, target="http://product-service:8000", path = f"/media/{path}")


# Auth Service
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, AUTH_SERVICE_URL, f"/auth/{path}")


@app.get("/auth/me")
async def proxy_auth_me(request: Request):
    return await proxy_request(request, AUTH_SERVICE_URL, "/auth/me")


# Frontend
@app.api_route("/{path:path}", methods=["GET"])
async def proxy_frontend(request: Request, path: str):
    # avoid conflicts
    if path.startswith(("api/", "auth/", "media/")):
        raise HTTPException(404, detail="Not Found")

    return await proxy_request(request, FRONTEND_SERVICE_URL, f"/{path}")


# ================================
#     Для WebSocket'ів Next.js
# ================================

from fastapi import WebSocket, WebSocketDisconnect
import websockets
import asyncio

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
                except:
                    await ws.close()

            await asyncio.gather(client_to_backend(), backend_to_client())

    except:
        await ws.close()
