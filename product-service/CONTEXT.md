# Product Service — Context & Architecture

## 1. Overview

The **Product Service** is a Django REST Framework (DRF) microservice that powers the product catalog and shopping cart for the e-commerce platform. It provides a **RESTful JSON API** for browsing products/categories, managing inventory, and handling per-user shopping carts.

- **Stack**: Python 3.11, Django 5.2, Django REST Framework 3.16, PostgreSQL, Docker
- **Language/Locale**: Ukrainian (`uk-ua`) with `Europe/Kyiv` timezone
- **API Documentation**: Auto-generated OpenAPI schema available at `/api/docs/` (Swagger) and `/api/redoc/` (ReDoc)
- **Port**: 8000 (internal Docker network)

---

## 2. Architecture

```
Client (Frontend / External)
        │
        ▼
   ┌──────────┐
   │  Gateway  │  (FastAPI – sets X-Gateway-* headers after verifying JWT/Session)
   └────┬─────┘
        │  X-Gateway-User-Id, X-Gateway-User-Role, X-Gateway-User-Email, X-Gateway-User-Name
        ▼
┌──────────────────┐
│  Product Service  │  ← THIS SERVICE
│  (Django + DRF)   │
│  Port 8000        │
└──────┬───────────┘
       │
       ▼
┌─────────────┐     ┌──────────┐
│ PostgreSQL  │     │  Media   │
│ (products_db)│     │  Volume  │
└─────────────┘     └──────────┘
```

### Authentication Flow

The service does **not** issue or validate JWTs directly. Instead, it trusts headers forwarded by the upstream API Gateway:

| Header | Meaning |
|---|---|
| `X-Gateway-User-Id` | The user's unique ID from Better Auth |
| `X-Gateway-User-Role` | `"user"` or `"admin"` |
| `X-Gateway-User-Email` | User's email |
| `X-Gateway-User-Name` | User's display name |

The custom `GatewayAuthentication` class reads these headers, syncs a local Django `User` record (creating it on first request), and sets `is_staff` / `is_superuser` based on the role. DRF's standard permission classes (`IsAuthenticatedOrReadOnly`, `IsAdminUser`) then work naturally on top of this.

Carts are scoped per-user via the `X-Gateway-User-Id` header — each user has exactly one cart, auto-created on first access.

---

## 3. Data Models

### 3.1 Category (`products.Category`)

| Field | Type | Notes |
|---|---|---|
| `id` | AutoField (PK) | |
| `name` | CharField(100) | **Unique**, required |
| `image` | ImageField | Optional, stored in `category_images/` |
| `created_at` | DateTimeField | Auto-set on create |
| `updated_at` | DateTimeField | Auto-updated on save |

- Ordering: alphabetical by `name`
- Related: `category.products` → all Products in this category

### 3.2 Product (`products.Product`)

| Field | Type | Notes |
|---|---|---|
| `id` | AutoField (PK) | |
| `name` | CharField(200) | Required |
| `description` | TextField | Required |
| `category` | FK → Category | Required, CASCADE on delete |
| `features` | JSONField | List of strings, e.g. `["waterproof","bluetooth"]` |
| `price` | Decimal(10,2) | ≥ 0, required |
| `original_price` | Decimal(10,2) | ≥ 0, db column `originalPrice` |
| `stock` | PositiveIntegerField | Default 0 |
| `in_stock` | BooleanField | Auto-synced: `True` when `stock > 0`, db column `inStock` |
| `image` | ImageField | Optional, stored in `product_images/` |
| `rating` | Decimal(2,1) | 0.0–5.0, default 0.0 |
| `specs` | JSONField | Dictionary, e.g. `{"color":"red","weight":"1kg"}` |
| `created_at` | DateTimeField | Auto-set on create |
| `updated_at` | DateTimeField | Auto-updated on save |

- Ordering: newest first (`-created_at`)
- Index: on `category`
- `in_stock` is kept in sync with `stock` in the `save()` method
- Validation: `original_price` must be ≥ `price` (cannot show a "discount" with original lower than current)

### 3.3 Cart (`products.Cart`)

| Field | Type | Notes |
|---|---|---|
| `id` | AutoField (PK) | |
| `user_id` | CharField(255) | Indexed, scoped per user |
| `created_at` | DateTimeField | Auto-set |
| `updated_at` | DateTimeField | Auto-updated |

### 3.4 CartItem (`products.CartItem`)

| Field | Type | Notes |
|---|---|---|
| `id` | AutoField (PK) | |
| `cart` | FK → Cart | CASCADE |
| `product` | FK → Product | CASCADE |
| `quantity` | PositiveIntegerField | Default 1 |
| `added_at` | DateTimeField | Auto-set |

- Unique constraint: `(cart, product)` — no duplicate product entries in a cart

---

## 4. API Endpoints

### 4.1 Product Endpoints

Base path: `/api/products/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products/` | Public (read) / Auth (read) | **List** all products (paginated, 20/page, max 100) |
| `POST` | `/api/products/` | **Admin only** | **Create** a new product |
| `GET` | `/api/products/{id}/` | Public (read) / Auth (read) | **Retrieve** a single product |
| `PUT`/`PATCH` | `/api/products/{id}/` | **Admin only** | **Update** a product |
| `DELETE` | `/api/products/{id}/` | **Admin only** | **Delete** a product |
| `GET` | `/api/products/low_stock/` | Public / Auth | List products with `stock ≤ threshold` (default 10) and `in_stock=True` |
| `GET` | `/api/products/by_category/` | Public / Auth | List **in-stock** products for a given `category_id` |
| `POST` | `/api/products/{id}/update_stock/` | **Admin only** | Atomically adjust stock (positive = restock, negative = deduct) |

### 4.2 Category Endpoints

Base path: `/api/categories/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/categories/` | Public / Auth | **List** all categories (paginated) |
| `POST` | `/api/categories/` | **Admin only** | **Create** a category |
| `GET` | `/api/categories/{id}/` | Public / Auth | **Retrieve** a category (includes `product_count`) |
| `PUT`/`PATCH` | `/api/categories/{id}/` | **Admin only** | **Update** a category |
| `DELETE` | `/api/categories/{id}/` | **Admin only** | **Delete** a category |

### 4.3 Cart Endpoints

Base path: `/api/cart/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart/` | **Authenticated** | Get the current user's cart (auto-creates if missing) |
| `POST` | `/api/cart/add_item/` | **Authenticated** | Add product to cart (or increase quantity if already present) |
| `POST` | `/api/cart/update_item/` | **Authenticated** | Set product quantity (0 = remove) |
| `POST` | `/api/cart/remove_item/` | **Authenticated** | Remove a product from cart |
| `POST` | `/api/cart/clear/` | **Authenticated** | Empty the entire cart |
| `POST` | `/api/cart/merge/` | **Authenticated** | Merge localStorage cart items on login |

All cart endpoints require the `X-Gateway-User-Id` header. Anonymous requests get `401 Unauthorized`.

**Cart response includes**:
- `items[]` — each with `product`, `product_name`, `product_price`, `product_image`, `quantity`, `added_at`
- `total` — sum of all `product.price × quantity`
- `item_count` — total number of items

---

## 5. Filtering, Search & Ordering (Products)

Supported via query parameters:

| Parameter | Type | Example |
|---|---|---|
| `search` | Text | `?search=phone` (searches `name` and `description`) |
| `name` | Text (icontains) | `?name=apple` |
| `category` | Integer (category ID) | `?category=3` |
| `min_price` | Number | `?min_price=100` |
| `max_price` | Number | `?max_price=500` |
| `min_stock` | Number | `?min_stock=5` |
| `max_stock` | Number | `?max_stock=50` |
| `in_stock` | Boolean | `?in_stock=true` |
| `created_after` | DateTime | `?created_after=2025-01-01T00:00:00Z` |
| `created_before` | DateTime | `?created_before=2025-12-31T23:59:59Z` |
| `ordering` | Field name | `?ordering=-price` (descending price) |

Orderable fields: `name`, `price`, `stock`, `created_at`, `updated_at`. Default: `-created_at`.

Categories support: `search` (name/description), `ordering` (name, created_at). Default: `name` ascending.

**Pagination**: All list endpoints are paginated — `page_size=20` (configurable via `?page_size=N`, max 100). Response wrapper: `{ "count": N, "next": "...", "previous": "...", "results": [...] }`.

---

## 6. User Roles & Permissions

### Anonymous (unauthenticated)
- Can **browse** products and categories (list & detail views)
- Can use `low_stock` and `by_category` custom actions
- **Cannot** create, update, or delete products/categories
- **Cannot** access cart (returns 401)

### Regular User (authenticated via Gateway, role=`user`)
- Same read access as anonymous
- **Can** access their own cart (full CRUD: add, update, remove, clear, merge)
- **Cannot** create, update, or delete products/categories

### Admin (authenticated via Gateway, role=`admin`)
- **Can** browse products and categories
- **Can** create new products and categories
- **Can** update any product or category (including price, stock, images, features, specs)
- **Can** delete any product or category
- **Can** adjust stock atomically via `update_stock` (restock or deduct)
- **Can** access the Django Admin panel at `/admin/`
- **Can** access their own cart

---

## 7. Admin Interface (Django Admin)

Accessible at `/admin/` for users with `is_staff=True` (synced from gateway's `role=admin`).

### Category Admin
- **List view**: `name`, `created_at`, `updated_at`
- **Search**: by `name`

### Product Admin
- **List view**: `name`, `price`, `original_price`, `in_stock`, `category`, `features`, `specs`, `image`, `rating`, `created_at`
- Filtering, search, and inline editing are available but currently commented out in `admin.py` (can be enabled as needed)

Admins can manage all products and categories through the admin panel — including bulk operations, image uploads, and direct field editing.

---

## 8. Media & Images

- **Category images**: stored in `media/category_images/`
- **Product images**: stored in `media/product_images/`
- Accepted formats: JPEG, PNG, WebP, GIF (validated in serializer)
- Images are served via Django's static file serving in development (`MEDIA_URL=/media/`)
- In production, a reverse proxy (nginx) or CDN should handle media serving
- The API returns **relative URLs** for images (e.g., `/media/product_images/photo.jpg`); the frontend constructs the full URL from its configured API base

---

## 9. Stock Management

- `Product.stock` tracks inventory quantity as a non-negative integer
- `Product.in_stock` is automatically synced: `True` when `stock > 0`, `False` otherwise
- The `update_stock` custom action provides **atomic stock adjustment** using:
  - `select_for_update()` — row-level locking to prevent race conditions
  - `F()` expressions — database-level arithmetic (no read-modify-write)
  - `transaction.atomic()` — ensures consistency
- `quantity` parameter: positive = restock, negative = deduct
- Returns `400 Bad Request` if deduction would result in negative stock

---

## 10. Shopping Cart Features

- **One cart per user**: auto-created on first access
- **Add item**: if product already in cart, quantity is incremented
- **Update item**: set exact quantity; setting to 0 removes the item
- **Remove item**: explicit removal by product ID
- **Clear**: empties the entire cart
- **Merge**: on login, the frontend sends localStorage items which are merged into the server-side cart (existing items have quantities incremented)
- Cart responses include computed `total` price and `item_count`

---

## 11. Rate Limiting (Throttling)

| Tier | Limit |
|---|---|
| Anonymous | 60 requests/minute |
| Authenticated | 300 requests/minute |

---

## 12. Testing

Comprehensive test suite in `products/tests.py` covering:

- **Model tests**: Category creation, ordering, uniqueness; Product creation, `in_stock` sync, ordering, rating/price constraints
- **Serializer tests**: valid/invalid data for both Category and Product serializers, field validations, edge cases
- **API tests (Product)**: list/retrieve/create/update/delete, pagination, filtering by category/name/price range, custom actions (`low_stock`, `by_category`), permission enforcement (403 for non-admin writes)
- **API tests (Cart)**: get cart (auto-create), add/update/remove items, authentication required, nonexistent product handling
- Test runner: Django's standard `TestCase` and DRF's `APITestCase`

Run with: `python manage.py test`

---

## 13. Deployment

### Docker
- Base image: `python:3.11-slim`
- System dependencies: `postgresql-client`, `gcc`
- Python dependencies installed via `pip install -r requirements.txt`
- Code copied into `/app`, port 8000 exposed

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `False` | Enable Django debug mode |
| `DJANGO_SECRET_KEY` | *(required in prod)* | Django secret key |
| `DB_NAME` | `products_db` | PostgreSQL database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_HOST` | `products_db` | Database host (Docker service name) |
| `DB_PORT` | `5432` | Database port |
| `ALLOWED_HOSTS` | `localhost` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` | Comma-separated CORS origins |

### Docker Compose (from root)
The service is part of the multi-service `docker-compose.yaml` alongside `auth-service`, `frontend`, `gateway`, `products_db` (PostgreSQL), `auth_db`, and `redis`.

---

## 14. Dependencies (`requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| Django | 5.2.8 | Web framework |
| djangorestframework | 3.16.0 | REST API toolkit |
| django-filter | 25.2 | Advanced queryset filtering |
| psycopg2-binary | 2.9.11 | PostgreSQL adapter |
| django-cors-headers | 4.9.0 | CORS middleware |
| python-decouple | 3.8 | Environment variable handling |
| Pillow | 12.0.0 | Image processing (for ImageField) |
| drf-spectacular | 0.28.0 | OpenAPI schema generation |

---

## 15. Project Structure

```
product-service/
├── Dockerfile
├── requirements.txt
├── manage.py
├── .env                          # Local dev environment variables
├── .dockerignore
├── .gitignore
├── media/                        # Uploaded images (git-ignored)
│   ├── category_images/
│   └── product_images/
├── product_service/              # Django project config
│   ├── __init__.py
│   ├── settings.py               # All settings (DB, DRF, CORS, logging, etc.)
│   ├── urls.py                   # Root URL conf (admin, api, schema)
│   ├── asgi.py
│   └── wsgi.py
└── products/                     # Main Django app
    ├── __init__.py
    ├── apps.py
    ├── models.py                 # Product & Category models
    ├── cart_models.py            # Cart & CartItem models
    ├── serializers.py            # Product & Category serializers
    ├── cart_serializers.py       # Cart & CartItem serializers
    ├── views.py                  # ProductViewSet & CategoryViewSet
    ├── cart_views.py             # CartViewSet
    ├── urls.py                   # Product & Category routes
    ├── cart_urls.py              # Cart routes
    ├── authentication.py         # GatewayAuthentication class
    ├── admin.py                  # Django Admin registration
    ├── filters.py                # ProductFilter (django-filter)
    ├── pagination.py             # StandardResultsSetPagination
    ├── tests.py                  # Full test suite
    └── migrations/               # Database migrations
```
