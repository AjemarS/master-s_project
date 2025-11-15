from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import logging

# Налаштування логування
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="API Gateway",
    description="Кастомний API Gateway на FastAPI для мікросервісної архітектури",
    version="1.0.0",
)

# CORS налаштування
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL сервісів з environment variables
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://product-service:8000")
FRONTEND_SERVICE_URL = os.getenv("FRONTEND_SERVICE_URL", "http://frontend:3000")

# HTTP клієнт з таймаутами
client = httpx.AsyncClient(timeout=30.0)


@app.get("/")
async def root():
    """Головна сторінка Gateway"""
    return {
        "service": "API Gateway",
        "version": "1.0.0",
        "endpoints": {"api": "/api/*", "admin": "/admin/*", "frontend": "/*"},
    }


@app.get("/health")
async def health_check():
    """Перевірка здоров'я Gateway та всіх сервісів"""
    services_health = {}

    # Перевірка Product Service
    try:
        response = await client.get(f"{PRODUCT_SERVICE_URL}/api/products/", timeout=5.0)
        services_health["product-service"] = {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "status_code": response.status_code,
        }
    except Exception as e:
        services_health["product-service"] = {"status": "unhealthy", "error": str(e)}

    # Перевірка Frontend
    try:
        response = await client.get(FRONTEND_SERVICE_URL, timeout=5.0)
        services_health["frontend"] = {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "status_code": response.status_code,
        }
    except Exception as e:
        services_health["frontend"] = {"status": "unhealthy", "error": str(e)}

    all_healthy = all(
        service.get("status") == "healthy" for service in services_health.values()
    )

    return {
        "gateway": "healthy",
        "services": services_health,
        "overall_status": "healthy" if all_healthy else "degraded",
    }


async def proxy_request(request: Request, target_url: str, path: str = ""):
    """Універсальна функція для проксування запитів"""

    # Формування URL
    url = f"{target_url}{path}"

    # Отримання headers (без host)
    headers = dict(request.headers)
    headers.pop("host", None)

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

        # Формування відповіді
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type"),
        )

    except httpx.TimeoutException:
        logger.error(f"Timeout while proxying to {url}")
        raise HTTPException(status_code=504, detail="Gateway Timeout")
    except httpx.RequestError as e:
        logger.error(f"Error while proxying to {url}: {str(e)}")
        raise HTTPException(status_code=502, detail="Bad Gateway")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_to_product_service(request: Request, path: str):
    """Проксування запитів до Product Service"""
    return await proxy_request(request, PRODUCT_SERVICE_URL, f"/api/{path}")


@app.api_route("/admin/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_to_admin(request: Request, path: str):
    """Проксування запитів до Django Admin"""
    return await proxy_request(request, PRODUCT_SERVICE_URL, f"/admin/{path}")


@app.get("/admin")
async def proxy_to_admin_root(request: Request):
    """Проксування до Django Admin root"""
    return await proxy_request(request, PRODUCT_SERVICE_URL, "/admin/")


@app.api_route("/static/{path:path}", methods=["GET"])
async def proxy_to_static(request: Request, path: str):
    """Проксування статичних файлів Django"""
    return await proxy_request(request, PRODUCT_SERVICE_URL, f"/static/{path}")


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_to_frontend(request: Request, path: str):
    """Проксування всіх інших запитів до Frontend"""
    # Виключаємо вже оброблені шляхи
    if path.startswith(("api/", "admin/", "static/", "health")):
        raise HTTPException(status_code=404, detail="Not Found")

    return await proxy_request(request, FRONTEND_SERVICE_URL, f"/{path}")


@app.on_event("shutdown")
async def shutdown_event():
    """Закриття HTTP клієнта при зупинці"""
    await client.aclose()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
