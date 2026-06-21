# Order Service

- Django 5.2 + DRF 3.16. Port 8002. DB: PostgreSQL (`orders_db`).
- Auth: `GatewayAuthentication` reads `X-Gateway-User-*` headers, syncs local Django User.
- Models: `Order` (order_number, channel, status, customer info, total_amount), `OrderItem` (product, quantity, price, cost_price).
- Status machine: pending → shipped → delivered; any → cancelled.
- API: orders CRUD, `POST /api/orders/` (online checkout), `POST /api/orders/pos/` (POS), `PATCH /api/orders/{id}/status/`, `GET /api/orders/my/`.
- Reports: `/api/reports/sales/`, `/api/reports/revenue/`, `/api/reports/inventory-value/`.
- Inventory integration: Saga via HTTP to inventory-service — reserve on create, deduct on ship, release on cancel.
- Run: `python manage.py runserver 0.0.0.0:8002`.
- Test: `python manage.py test`.
- API docs: `/api/docs/` (Swagger), `/api/redoc/` (ReDoc).
- RabbitMQ: publishes `order.created`, `order.cancelled`, `order.status_changed` to `techhub.events` exchange.
