from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
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
