# Inventory Service

- Django 5.2 + DRF 3.16. Port 8001. DB: PostgreSQL (`inventory_db`).
- Auth: `GatewayAuthentication` reads `X-Gateway-User-*` headers, syncs local Django User.
- Models: `Warehouse`, `Stock`, `StockMovement`, `Supplier`, `GoodsReceiptNote`, `GoodsReceiptItem`.
- API endpoints under `/api/`: warehouses, stock (reserve/deduct/release), stock/movements, suppliers, goods-receipts.
- Business logic: atomic reserve/deduct/release via `select_for_update`. GRN creation auto-increments stock.
- Run: `python manage.py runserver 0.0.0.0:8001`.
- Test: `python manage.py test`.
- API docs: `/api/docs/` (Swagger), `/api/redoc/` (ReDoc).
- RabbitMQ publisher (TODO): `inventory.stock.changed` on deduct/receipt.
