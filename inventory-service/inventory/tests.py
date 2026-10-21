import random
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, connections
from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import (
    ActivityEvent,
    GoodsReceiptItem,
    GoodsReceiptNote,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)

User = get_user_model()


def _create_warehouse(name="Main Warehouse", type="warehouse"):
    return Warehouse.objects.create(name=name, type=type)


def _create_supplier(name="Test Supplier"):
    return Supplier.objects.create(name=name)


def _create_stock(product_id=1, warehouse=None, quantity=100):
    if warehouse is None:
        warehouse = _create_warehouse()
    return Stock.objects.create(
        product_id=product_id, warehouse=warehouse, quantity=quantity
    )


def _create_admin_user():
    return User.objects.create_superuser("admin", "admin@test.com", "password123")


def _create_regular_user():
    return User.objects.create_user("user", "user@test.com", "password123")


class WarehouseModelTest(TestCase):
    def test_create_warehouse(self):
        w = _create_warehouse("Central Warehouse")
        self.assertEqual(str(w), "Central Warehouse")
        self.assertEqual(w.type, "warehouse")

    def test_create_showroom(self):
        w = _create_warehouse("Kyiv Showroom", type="showroom")
        self.assertEqual(w.type, "showroom")

    def test_warehouse_ordering(self):
        _create_warehouse("B")
        _create_warehouse("A")
        warehouses = list(Warehouse.objects.all())
        self.assertEqual(warehouses[0].name, "A")
        self.assertEqual(warehouses[1].name, "B")


class SupplierModelTest(TestCase):
    def test_create_supplier(self):
        s = _create_supplier()
        self.assertEqual(str(s), "Test Supplier")
        self.assertTrue(s.is_active)


class StockModelTest(TestCase):
    def test_create_stock(self):
        w = _create_warehouse()
        s = _create_stock(product_id=1, warehouse=w, quantity=50)
        self.assertEqual(s.quantity, 50)
        self.assertEqual(s.reserved, 0)
        self.assertEqual(s.available, 50)

    def test_available_property(self):
        w = _create_warehouse()
        s = _create_stock(product_id=1, warehouse=w, quantity=100)
        s.reserved = 30
        self.assertEqual(s.available, 70)

    def test_unique_together(self):
        w = _create_warehouse()
        _create_stock(product_id=1, warehouse=w)
        with self.assertRaises(IntegrityError):
            Stock.objects.create(product_id=1, warehouse=w, quantity=10)


class StockMovementModelTest(TestCase):
    def test_create_movement(self):
        w = _create_warehouse()
        m = StockMovement.objects.create(
            product_id=1,
            from_warehouse=w,
            quantity=10,
            type=StockMovement.RECEIPT,
        )
        self.assertEqual(m.type, "receipt")
        self.assertIn("Оприбуткування", str(m))


class GoodsReceiptNoteModelTest(TestCase):
    def test_create_grn(self):
        w = _create_warehouse()
        s = _create_supplier()
        grn = GoodsReceiptNote.objects.create(
            supplier=s,
            warehouse=w,
            receipt_date="2026-06-01",
        )
        self.assertEqual(str(grn), f"GRN #{grn.pk} - Test Supplier")

    def test_grn_items(self):
        w = _create_warehouse()
        s = _create_supplier()
        grn = GoodsReceiptNote.objects.create(
            supplier=s, warehouse=w, receipt_date="2026-06-01"
        )
        GoodsReceiptItem.objects.create(
            goods_receipt=grn,
            product_id=1,
            quantity=10,
            cost_price=Decimal("150.00"),
        )
        GoodsReceiptItem.objects.create(
            goods_receipt=grn,
            product_id=2,
            quantity=5,
            cost_price=Decimal("200.00"),
        )
        self.assertEqual(grn.items.count(), 2)


class WarehouseAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_warehouses_empty(self):
        response = self.client.get("/api/warehouses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_warehouse_unauthenticated(self):
        response = self.client.post(
            "/api/warehouses/", {"name": "New Warehouse", "type": "warehouse"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_warehouse_admin(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/warehouses/", {"name": "New Warehouse", "type": "warehouse"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Warehouse.objects.count(), 1)


class StockAPITest(APITestCase):
    def setUp(self):
        self.warehouse = _create_warehouse()
        self.stock = _create_stock(
            product_id=1, warehouse=self.warehouse, quantity=100
        )
        self.client = APIClient()

    def test_list_stock(self):
        response = self.client.get("/api/stock/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reserve_stock_success(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/reserve/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "quantity": 30,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.reserved, 30)

    def test_reserve_stock_insufficient(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/reserve/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "quantity": 200,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deduct_stock_success(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/deduct/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "quantity": 30,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, 70)

    def test_deduct_stock_insufficient(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/deduct/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "quantity": 200,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_release_stock(self):
        self.stock.reserved = 50
        self.stock.save()
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/release/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "quantity": 20,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.reserved, 30)

    def test_adjust_stock_success(self):
        self.stock.reserved = 10
        self.stock.save()
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/adjust/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "new_quantity": 200,
                "reason": "Inventory count",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, 200)
        self.assertEqual(self.stock.reserved, 10)

    def test_adjust_stock_unauthorized(self):
        user = _create_regular_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/stock/adjust/",
            {
                "product_id": 1,
                "warehouse_id": self.warehouse.pk,
                "new_quantity": 200,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class GoodsReceiptAPITest(APITestCase):
    def setUp(self):
        self.warehouse = _create_warehouse()
        self.supplier = _create_supplier()
        self.client = APIClient()

    def test_create_grn_with_items(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/goods-receipts/",
            {
                "supplier": self.supplier.pk,
                "warehouse": self.warehouse.pk,
                "receipt_date": "2026-06-01",
                "items": [
                    {"product_id": 1, "quantity": 10, "cost_price": "150.00"},
                    {"product_id": 2, "quantity": 5, "cost_price": "200.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GoodsReceiptNote.objects.count(), 1)
        self.assertEqual(GoodsReceiptItem.objects.count(), 2)

        stock1 = Stock.objects.get(product_id=1, warehouse=self.warehouse)
        self.assertEqual(stock1.quantity, 10)
        stock2 = Stock.objects.get(product_id=2, warehouse=self.warehouse)
        self.assertEqual(stock2.quantity, 5)


class ActivityEventModelTest(TestCase):
    def test_string_representation(self):
        event = ActivityEvent.objects.create(
            event_type="create",
            message="Test activity event message",
            entity_type="product",
            entity_id="42",
            user_name="Admin User",
            user_email="admin@test.com",
        )
        expected = f"[create] {event.message[:50]}"
        self.assertEqual(str(event), expected)

    def test_ordering_most_recent_first(self):
        ActivityEvent.objects.create(
            event_type="info", message="First", entity_type="test",
            user_name="User", user_email="u@test.com",
        )
        ActivityEvent.objects.create(
            event_type="info", message="Second", entity_type="test",
            user_name="User", user_email="u@test.com",
        )
        events = list(ActivityEvent.objects.all())
        self.assertEqual(events[0].message, "Second")
        self.assertEqual(events[1].message, "First")


class ActivityEventAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.list_url = "/api/activity/events/"

    def test_post_without_auth_returns_401(self):
        response = self.client.post(
            self.list_url,
            {"event_type": "info", "message": "test", "entity_type": "test"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_with_auth_creates_event_with_correct_user(self):
        user = _create_regular_user()
        user.name = "Regular User"
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.list_url,
            {"event_type": "create", "message": "Created a product", "entity_type": "product", "entity_id": "99"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ActivityEvent.objects.count(), 1)
        event = ActivityEvent.objects.first()
        self.assertEqual(event.user_name, "Regular User")
        self.assertEqual(event.user_email, "user@test.com")
        self.assertEqual(event.event_type, "create")
        self.assertEqual(event.message, "Created a product")

    def test_get_returns_list_not_paginated(self):
        ActivityEvent.objects.create(
            event_type="info", message="Event 1", entity_type="test",
            user_name="User", user_email="u@test.com",
        )
        ActivityEvent.objects.create(
            event_type="info", message="Event 2", entity_type="test",
            user_name="User", user_email="u@test.com",
        )
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is a bare list, not a paginated {count, results} object
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)


def _deliver_order_created(event):
    """Deliver order.created the way the inventory consumer does, if it subscribes to it."""
    from . import eventbus
    handler = getattr(eventbus, "QUEUE_MAP", {}).get("inventory.order.reserve")
    if handler:
        handler(event, event["event_id"])


class LastUnitReservationRaceTest(TransactionTestCase):
    """K2: 100 parallel orders for the last unit -> exactly one reservation (fix #1)."""

    ORDERS = 100
    ROUNDS = 20

    def setUp(self):
        self.admin = _create_admin_user()
        self.warehouse = _create_warehouse()

    def _http_reserve(self, order_id):
        try:
            client = APIClient()
            client.force_authenticate(user=self.admin)
            return client.post("/api/stock/reserve/", {
                "product_id": 1, "warehouse_id": self.warehouse.pk, "quantity": 1,
                "reference_type": "order", "reference_id": str(order_id),
                "idempotency_key": f"reserve-{order_id}-1",
            }).status_code
        finally:
            connections.close_all()

    def _event(self, order_id):
        try:
            _deliver_order_created({
                "event_id": f"evt-{order_id}", "order_id": order_id, "channel": "online",
                "warehouse_id": self.warehouse.pk, "items": [{"product_id": 1, "quantity": 1}],
            })
        finally:
            connections.close_all()

    def test_last_unit_is_reserved_exactly_once(self):
        for rnd in range(self.ROUNDS):
            cache.clear()  # DRF user throttle (300/min) would otherwise reject later rounds
            Stock.objects.filter(product_id=1).delete()
            stock = _create_stock(product_id=1, warehouse=self.warehouse, quantity=1)
            base = rnd * self.ORDERS
            tasks = [(self._http_reserve, base + i) for i in range(self.ORDERS)]
            tasks += [(self._event, base + i) for i in range(self.ORDERS)]
            random.shuffle(tasks)
            with ThreadPoolExecutor(max_workers=40) as pool:
                results = [f.result() for f in [pool.submit(fn, oid) for fn, oid in tasks]]
            ok = results.count(status.HTTP_200_OK)
            stock.refresh_from_db()
            self.assertEqual(ok, 1, f"round {rnd}: {ok} successful orders")
            self.assertEqual(stock.reserved, 1, f"round {rnd}: reserved={stock.reserved}")
            self.assertLessEqual(stock.reserved, stock.quantity)


class InventoryReadAccessTest(APITestCase):
    """Suppliers, GRNs and the movement log are staff-only; storefront availability stays public (fix #6)."""

    STAFF_ONLY = [
        "/api/suppliers/",
        "/api/goods-receipts/",
        "/api/stock/movements/",
    ]

    def setUp(self):
        self.warehouse = _create_warehouse()
        self.stock = _create_stock(product_id=1, warehouse=self.warehouse, quantity=5)
        self.urls = self.STAFF_ONLY + [
            f"/api/stock/{self.stock.pk}/movements/",
            f"/api/goods-receipts/product_info/?product_id=1&warehouse_id={self.warehouse.pk}",
        ]

    def _as(self, role):
        return {"HTTP_X_GATEWAY_USER_ID": f"{role}-1", "HTTP_X_GATEWAY_USER_ROLE": role}

    def test_anonymous_and_customer_cannot_read_staff_data(self):
        for url in self.urls:
            for headers in ({}, self._as("user"), self._as("cashier")):
                response = self.client.get(url, **headers)
                self.assertIn(response.status_code, (401, 403), f"{url} {headers}")

    def test_warehouse_worker_and_admin_can_read_staff_data(self):
        for url in self.urls:
            for role in ("warehouse_worker", "admin"):
                response = self.client.get(url, **self._as(role))
                self.assertEqual(response.status_code, 200, f"{url} {role}")

    def test_storefront_availability_and_showrooms_stay_public(self):
        self.assertEqual(self.client.get("/api/stock/").status_code, 200)
        self.assertEqual(self.client.get("/api/warehouses/").status_code, 200)


class DeductBatchTest(APITestCase):
    """All items of an order are written off in one transaction, or none are (fix #2)."""

    def setUp(self):
        self.client.force_authenticate(user=_create_admin_user())
        self.warehouse = _create_warehouse()
        self.a = _create_stock(product_id=1, warehouse=self.warehouse, quantity=5)
        self.b = _create_stock(product_id=2, warehouse=self.warehouse, quantity=1)

    def _deduct(self, items, from_reserved=False, key="deduct-7"):
        return self.client.post("/api/stock/deduct_batch/", {
            "warehouse_id": self.warehouse.pk, "reference_type": "order", "reference_id": "7",
            "idempotency_key": key, "from_reserved": from_reserved, "items": items,
        }, format="json")

    def _levels(self, stock):
        stock.refresh_from_db()
        return stock.quantity, stock.reserved

    def test_failing_second_item_leaves_first_item_untouched(self):
        Stock.objects.filter(pk=self.a.pk).update(reserved=1)
        response = self._deduct([{"product_id": 1, "quantity": 1}, {"product_id": 2, "quantity": 3}])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._levels(self.a), (5, 1))
        self.assertEqual(self._levels(self.b), (1, 0))
        self.assertFalse(StockMovement.objects.filter(type=StockMovement.DEDUCT).exists())

    def test_reserved_last_unit_can_be_shipped(self):
        Stock.objects.filter(pk=self.b.pk).update(reserved=1)
        response = self._deduct([{"product_id": 2, "quantity": 1}], from_reserved=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._levels(self.b), (0, 0))

    def test_sale_without_reservation_keeps_other_reservations(self):
        Stock.objects.filter(pk=self.a.pk).update(reserved=2)
        response = self._deduct([{"product_id": 1, "quantity": 3}])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._levels(self.a), (2, 2))

    def test_sale_cannot_take_reserved_units(self):
        Stock.objects.filter(pk=self.a.pk).update(reserved=4)
        response = self._deduct([{"product_id": 1, "quantity": 2}])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._levels(self.a), (5, 4))

    def test_replay_with_same_key_is_not_deducted_twice(self):
        items = [{"product_id": 1, "quantity": 2}]
        self.assertEqual(self._deduct(items).status_code, status.HTTP_200_OK)
        self.assertEqual(self._deduct(items).status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(self._levels(self.a), (3, 0))

    def test_return_to_stock_adds_units_once(self):
        body = {"product_id": 1, "warehouse_id": self.warehouse.pk, "quantity": 2,
                "reference_type": "return", "reference_id": "9", "idempotency_key": "return-9"}
        self.assertEqual(self.client.post("/api/stock/return_to_stock/", body, format="json").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post("/api/stock/return_to_stock/", body, format="json").status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(self._levels(self.a), (7, 0))
        movement = StockMovement.objects.get(type=StockMovement.RETURN)
        self.assertEqual((movement.to_warehouse_id, movement.from_warehouse_id), (self.warehouse.pk, None))

    def test_deduct_reports_unit_cost_of_goods_sold(self):
        Stock.objects.filter(pk=self.a.pk).update(average_cost=Decimal("123.45"))
        response = self._deduct([{"product_id": 1, "quantity": 2}])
        self.assertEqual(response.data["unit_costs"], {"1": "123.45"})
        self.assertNotIn("average_cost", response.data["items"][0])  # stock rows stay public-safe


class AnalyticsEndpointsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.warehouse = _create_warehouse()
        Stock.objects.create(product_id=1, warehouse=self.warehouse, quantity=4, average_cost=Decimal("100.00"))
        Stock.objects.create(product_id=1, warehouse=_create_warehouse("Showroom", "showroom"), quantity=1, average_cost=Decimal("120.00"))
        Stock.objects.create(product_id=2, warehouse=self.warehouse, quantity=3)  # no GRN yet: cost 0
        Stock.objects.create(product_id=3, warehouse=self.warehouse, quantity=0, average_cost=Decimal("50.00"))

    def test_valuation_uses_average_cost_and_skips_empty_stock(self):
        self.client.force_authenticate(user=_create_admin_user())
        data = self.client.get("/api/stock/valuation/").data
        self.assertEqual(data["total_value"], 520.0)
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(data["uncosted_quantity"], 3)
        self.assertEqual(data["by_product"][0], {"product_id": 1, "total_quantity": 5, "total_value": 520.0})

    def test_valuation_is_admin_only(self):
        self.client.force_authenticate(user=_create_regular_user())
        self.assertEqual(self.client.get("/api/stock/valuation/").status_code, status.HTTP_403_FORBIDDEN)

    def test_supplier_stats_aggregates_all_receipts(self):
        big, small = _create_supplier("Big"), _create_supplier("Small")
        for supplier, day, qty, cost in [(big, "2026-06-01", 10, "100"), (big, "2026-06-05", 2, "100"), (small, "2026-06-03", 1, "50")]:
            grn = GoodsReceiptNote.objects.create(supplier=supplier, warehouse=self.warehouse, receipt_date=day)
            GoodsReceiptItem.objects.create(goods_receipt=grn, product_id=1, quantity=qty, cost_price=Decimal(cost))
        self.client.force_authenticate(user=_create_admin_user())
        rows = self.client.get("/api/goods-receipts/supplier-stats/").data
        self.assertEqual([r["supplier_name"] for r in rows], ["Big", "Small"])
        self.assertEqual(rows[0]["total_items"], 12)
        self.assertEqual(rows[0]["total_value"], 1200.0)
        self.assertEqual(rows[0]["delivery_count"], 2)
        self.assertEqual(rows[0]["last_delivery"], "2026-06-05")

    def test_stock_analytics_cover_turnover_and_dead_stock(self):
        # setUp: product 1 has 5 on hand (value 520), product 2 has 3 uncosted, product 3 has 0
        StockMovement.objects.create(product_id=1, from_warehouse=self.warehouse, quantity=9, type=StockMovement.DEDUCT)
        old = StockMovement.objects.create(product_id=2, from_warehouse=self.warehouse, quantity=4, type=StockMovement.DEDUCT)
        StockMovement.objects.filter(pk=old.pk).update(created_at=old.created_at - timedelta(days=200))
        self.client.force_authenticate(user=_create_admin_user())

        data = self.client.get("/api/stock/analytics/?days=90").data
        rows = {r["product_id"]: r for r in data["products"]}
        self.assertEqual(rows[1]["units_sold"], 9)
        self.assertEqual(rows[1]["days_of_cover"], 50.0)          # 5 / (9 / 90)
        self.assertEqual(rows[1]["turnover"], 1.8)
        self.assertFalse(rows[1]["dead"])
        self.assertTrue(rows[2]["dead"])                           # sold only 200 days ago
        self.assertIsNotNone(rows[2]["last_sale_at"])
        self.assertFalse(rows[3]["dead"])                          # nothing on hand
        self.assertEqual(data["summary"]["dead_products"], 1)
        self.assertEqual(data["summary"]["units_sold"], 9)

    def test_stock_analytics_rejects_bad_window(self):
        self.client.force_authenticate(user=_create_admin_user())
        self.assertEqual(self.client.get("/api/stock/analytics/?days=1").status_code, status.HTTP_400_BAD_REQUEST)
