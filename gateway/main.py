from fastapi import FastAPI, Header
import httpx

app = FastAPI()

PRODUCT_SERVICE_URL = "http://product-service:8000/api"
AUTH_SERVICE_URL = "http://auth-service:8000/api/auth"


@app.get("/")
def root():
    return {"message": "API Gateway running"}


# ---- Proxy до Product Service ----
@app.get("/products")
async def get_products():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{PRODUCT_SERVICE_URL}/products/")
        return r.json()


# ---- Proxy до Auth Service ----
@app.post("/auth/register")
async def register_user(data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{AUTH_SERVICE_URL}/users/", json=data)
        return r.json()


@app.post("/auth/login")
async def login_user(data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{AUTH_SERVICE_URL}/jwt/create/", json=data)
        return r.json()


@app.get("/auth/users/me/")
async def get_current_user(token: str = Header(..., alias="Authorization")):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{AUTH_SERVICE_URL}/users/me/", headers={"Authorization": token}
        )
        return r.json()
