from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import os
import logging

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================
#       UNIVERSAL PROXY
# ================================
async def proxy_request(request: Request, target: str, path: str = ""):
    client: httpx.AsyncClient = request.app.state.client

    # Формування URL
    url = f"{target}{path}"

    # Отримання headers
    headers = dict(request.headers)
    # headers.pop("host", None)

    # Отримання body для POST/PUT/PATCH
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()

    # Отримання query parameters
    params = dict(request.query_params)
    logger.info(f"Proxying {request.method} {url}")

    try:
        # Виконання запиту
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            params=params,
            follow_redirects=True,
        )
        response_headers = dict(response.headers)

        # ВИДАЛЯЄМО "ПРОБЛЕМНІ" ЗАГОЛОВКИ
        response_headers.pop("content-encoding", None)
        response_headers.pop("content-length", None)

        # Формування відповіді
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
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_products(request: Request, path: str):
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
    # уникаємо конфліктів
    if path.startswith(("api/", "auth/", "admin/", "static/")):
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
