# Product Service

- Django 5.2 + DRF 3.16 (see `requirements.txt`). Port 8000. DB: PostgreSQL (`products_db`).
- Auth: `GatewayAuthentication` reads `X-Gateway-User-*` headers, syncs local Django User.
- Apps: `ProductViewSet`, `CategoryViewSet`, `CartViewSet` under `products/`.
- Run: `python manage.py runserver 0.0.0.0:8000` (migrations run automatically in docker-compose).
- Test: `python manage.py test`.
- API docs: `/api/docs/` (Swagger), `/api/redoc/` (ReDoc).
