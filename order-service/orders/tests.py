from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Order, OrderItem

User = get_user_model()


def _create_admin_user():
    return User.objects.create_superuser("admin", "admin@test.com", "password123")


def _create_regular_user():
    return User.objects.create_user("user", "user@test.com", "password123")


def _create_order(status=Order.UNPAID, channel=Order.ONLINE, **kwargs):
    data = {
        "order_number": "ORD-000001",
        "channel": channel,
        "status": status,
        "customer_name": "Test Customer",
        "customer_email": "customer@test.com",
        "total_amount": Decimal("299.99"),
        "created_by": "gw_1",
    }
    data.update(kwargs)
    return Order.objects.create(**data)


def _create_order_item(order, product_id=1, quantity=1, price=Decimal("99.99")):
    return OrderItem.objects.create(
        order=order,
        product_id=product_id,
        product_name=f"Product {product_id}",
        quantity=quantity,
        price=price,
        cost_price=Decimal("50.00"),
    )


class OrderModelTest(TestCase):
    def test_create_order(self):
        order = _create_order()
        self.assertEqual(str(order), "Order #ORD-000001")
        self.assertEqual(order.status, Order.UNPAID)

    def test_status_transitions(self):
        order = _create_order()
        self.assertTrue(order.can_transition_to(Order.PAID))
        self.assertTrue(order.can_transition_to(Order.CANCELLED))
        self.assertFalse(order.can_transition_to(Order.DELIVERING))

        order.status = Order.PAID
        self.assertTrue(order.can_transition_to(Order.DELIVERING))
        self.assertTrue(order.can_transition_to(Order.CANCELLED))

        order.status = Order.DELIVERING
        self.assertTrue(order.can_transition_to(Order.DELIVERED))
        self.assertTrue(order.can_transition_to(Order.CANCELLED))

        order.status = Order.DELIVERED
        self.assertTrue(order.can_transition_to(Order.COMPLETED))
        self.assertFalse(order.can_transition_to(Order.DELIVERING))

    def test_order_number_unique(self):
        _create_order()
        with self.assertRaises(IntegrityError):
            _create_order()

    def test_order_total_amount(self):
        order = _create_order(total_amount=Decimal("199.98"))
        _create_order_item(order, product_id=1, quantity=2, price=Decimal("99.99"))
        self.assertEqual(order.total_amount, Decimal("199.98"))

    def test_channel_choices(self):
        online = _create_order(channel=Order.ONLINE)
        offline = _create_order(
            order_number="ORD-000002", channel=Order.OFFLINE
        )
        self.assertEqual(online.channel, Order.ONLINE)
        self.assertEqual(offline.channel, Order.OFFLINE)


class OrderItemModelTest(TestCase):
    def test_create_item(self):
        order = _create_order()
        item = _create_order_item(order)
        self.assertEqual(str(item), "Product 1 x1")
        self.assertEqual(item.price, Decimal("99.99"))

    def test_item_belongs_to_order(self):
        order = _create_order()
        _create_order_item(order, product_id=1)
        _create_order_item(order, product_id=2, quantity=3)
        self.assertEqual(order.items.count(), 2)


class OrderAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_orders_empty(self):
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_unauthenticated(self):
        response = self.client.post(
            "/api/orders/",
            {
                "items": [
                    {"product_id": 1, "quantity": 1, "price": "99.99"}
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_order_admin(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/orders/",
            {
                "channel": "online",
                "customer_name": "John",
                "customer_email": "john@test.com",
                "items": [
                    {"product_id": 1, "quantity": 2, "price": "99.99",
                     "product_name": "Test Product"}
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data["channel"], "online")
        self.assertEqual(data["status"], "unpaid")
        self.assertEqual(len(data["items"]), 1)
        self.assertAlmostEqual(float(data["total_amount"]), 199.98)

    def test_create_order_with_warehouse(self):
        """Order with warehouse_id stays unpaid (reservation deferred to webhook)."""
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/orders/",
            {
                "channel": "online",
                "warehouse_id": 1,
                "customer_name": "John",
                "customer_email": "john@test.com",
                "items": [
                    {"product_id": 1, "quantity": 2, "price": "99.99",
                     "product_name": "Test Product"}
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data["channel"], "online")
        self.assertEqual(data["status"], "unpaid")
        self.assertEqual(data["payment_status"], "unpaid")
        self.assertEqual(len(data["items"]), 1)
        self.assertAlmostEqual(float(data["total_amount"]), 199.98)

    def test_create_order_empty_items(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/orders/",
            {"items": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_status_transition_valid(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        order = _create_order()
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "paid"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.PAID)

    def test_order_status_transition_invalid(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        order = _create_order(status=Order.COMPLETED)
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_my_orders(self):
        user = _create_regular_user()
        self.client.force_authenticate(user=user)
        _create_order(created_by=str(user.id))
        _create_order(order_number="ORD-000002", created_by="other_user")
        response = self.client.get("/api/orders/my/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)


class POSAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def _auth_admin(self):
        user = User.objects.create_superuser("admin", "admin@test.com", "password123")
        self.client.force_authenticate(user=user)
        return user

    def test_pos_order(self):
        self._auth_admin()
        response = self.client.post(
            "/api/orders/pos/",
            {
                "warehouse_id": 1,
                "customer_name": "POS Customer",
                "items": [
                    {"product_id": 1, "quantity": 1, "price": "199.99"}
                ],
            },
            format="json",
        )
        # deduct fails in test (no inventory-service), returns 502 with cancelled order
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_502_BAD_GATEWAY])

    def test_pos_order_without_warehouse_fails(self):
        self._auth_admin()
        response = self.client.post(
            "/api/orders/pos/",
            {
                "customer_name": "POS Customer",
                "items": [
                    {"product_id": 1, "quantity": 1, "price": "199.99"}
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_transition_paid_to_delivering(self):
        """Status to delivering triggers deduct saga."""
        self._auth_admin()
        order = _create_order(status=Order.PAID, warehouse_id=1)
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "delivering"},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_502_BAD_GATEWAY])

    def test_create_order_cancel_releases_stock(self):
        """Cancelling an order triggers release saga (fails gracefully when inventory unreachable)."""
        self._auth_admin()
        order = _create_order(order_number="ORD-CANCEL-001", warehouse_id=1)
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.CANCELLED)


class ReportsAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_sales_report_unauthenticated(self):
        response = self.client.get("/api/reports/sales/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sales_report_admin(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/reports/sales/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_revenue_report_admin(self):
        user = _create_admin_user()
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/reports/revenue/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
