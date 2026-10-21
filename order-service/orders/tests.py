import json
from datetime import datetime, time, timedelta
from decimal import Decimal
from unittest import mock
from urllib.error import URLError

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from . import order_service as svc
from .models import Order, OrderItem, OrderStatusHistory

User = get_user_model()

# Inventory is a separate service: unit tests stub its HTTP client instead of depending on a live stack
INVENTORY_OK = ({"ok": True}, None)


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

    @mock.patch("orders.order_service.reserve_stock", return_value=INVENTORY_OK)
    @mock.patch("orders.serializers.check_availability", return_value=(True, None))
    @mock.patch("orders.views.check_availability", return_value=(True, None))
    def test_create_order_with_warehouse(self, _check_view, _check_serializer, reserve):
        """Order with warehouse_id reserves every item."""
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
        reserve.assert_called_once()
        self.assertEqual(reserve.call_args.kwargs["quantity"], 2)

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

    @mock.patch("orders.order_service.deduct_stock_batch", return_value=INVENTORY_OK)
    def test_pos_order(self, deduct):
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
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["channel"], Order.OFFLINE)
        self.assertEqual(response.data["status"], Order.COMPLETED)
        self.assertEqual(response.data["payment_status"], Order.PAYMENT_PAID)
        deduct.assert_called_once()

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

    @mock.patch("orders.order_service.deduct_stock_batch", return_value=INVENTORY_OK)
    def test_status_transition_paid_to_delivering(self, deduct):
        """Status to delivering triggers deduct saga."""
        self._auth_admin()
        order = _create_order(status=Order.PAID, warehouse_id=1)
        _create_order_item(order, product_id=1, quantity=3)
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "delivering"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.DELIVERING)
        self.assertEqual(deduct.call_args.kwargs["items"], [{"product_id": 1, "quantity": 3}])
        self.assertTrue(deduct.call_args.kwargs["from_reserved"])

    @mock.patch("orders.order_service.release_stock", return_value=(None, "inventory unreachable"))
    def test_create_order_cancel_releases_stock(self, release):
        """Cancelling an order triggers release saga (fails gracefully when inventory unreachable)."""
        self._auth_admin()
        order = _create_order(order_number="ORD-CANCEL-001", warehouse_id=1)
        _create_order_item(order)
        response = self.client.patch(
            f"/api/orders/{order.pk}/status/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.CANCELLED)
        release.assert_called_once()


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


class ReportNumbersTest(APITestCase):
    """Every report counts the same orders and the same revenue."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=_create_admin_user())
        self.today = timezone.localdate()

    def _order(self, number, status, channel=Order.ONLINE, days_ago=0, lines=((2, "100.00", "60.00"),)):
        order = _create_order(
            order_number=number, status=status, channel=channel,
            total_amount=Decimal("999.00"),  # includes shipping: must not leak into revenue
        )
        for qty, price, cost in lines:
            OrderItem.objects.create(order=order, product_id=1, quantity=qty, price=Decimal(price), cost_price=Decimal(cost))
        created = timezone.make_aware(datetime.combine(self.today - timedelta(days=days_ago), time(12)))
        Order.objects.filter(pk=order.pk).update(created_at=created)
        return order

    def test_sales_revenue_and_daily_agree(self):
        self._order("A", Order.PAID)
        self._order("B", Order.COMPLETED, channel=Order.OFFLINE, lines=((1, "50.00", "20.00"),))
        self._order("C", Order.UNPAID)
        self._order("D", Order.CANCELLED)

        sales = self.client.get("/api/reports/sales/").data
        revenue = self.client.get("/api/reports/revenue/").data
        daily = self.client.get("/api/reports/daily-sales/").data["daily"]

        self.assertEqual(sales["total_orders"], 2)
        self.assertEqual(sales["total_revenue"], 250.0)
        self.assertEqual(sales["total_margin"], 110.0)
        self.assertEqual(sales["margin_percent"], 44.0)
        self.assertEqual(revenue["total_revenue"], sales["total_revenue"])
        self.assertEqual(revenue["order_count"], sales["total_orders"])
        self.assertEqual(sum(d["revenue"] for d in daily), sales["total_revenue"])
        self.assertEqual({c["channel"]: c["revenue"] for c in sales["by_channel"]}, {"online": 200.0, "offline": 50.0})

    def test_date_only_to_includes_whole_day(self):
        self._order("A", Order.PAID)
        data = self.client.get(f"/api/reports/sales/?to={self.today.isoformat()}").data
        self.assertEqual(data["total_orders"], 1)

    def test_from_excludes_older_orders(self):
        self._order("OLD", Order.PAID, days_ago=10)
        self._order("NEW", Order.PAID)
        frm = (self.today - timedelta(days=1)).isoformat()
        self.assertEqual(self.client.get(f"/api/reports/sales/?from={frm}").data["total_orders"], 1)

    def test_invalid_date_is_rejected(self):
        self.assertEqual(self.client.get("/api/reports/sales/?from=yesterday").status_code, status.HTTP_400_BAD_REQUEST)

    def test_daily_is_zero_filled(self):
        self._order("A", Order.PAID, days_ago=2)
        frm = (self.today - timedelta(days=3)).isoformat()
        daily = self.client.get(f"/api/reports/daily-sales/?from={frm}&to={self.today.isoformat()}").data["daily"]
        self.assertEqual([d["orders"] for d in daily], [0, 1, 0, 0])

    def test_previous_period_and_kpis(self):
        self._order("NOW", Order.PAID)                                       # revenue 200
        self._order("NOW-X", Order.CANCELLED)
        self._order("PREV", Order.PAID, days_ago=8, lines=((1, "50.00", "20.00"),))
        self._order("OLDER", Order.PAID, days_ago=20)
        frm, to = (self.today - timedelta(days=6)).isoformat(), self.today.isoformat()
        data = self.client.get(f"/api/reports/sales/?from={frm}&to={to}").data
        self.assertEqual(data["average_order_value"], 200.0)
        self.assertEqual(data["cancelled_orders"], 1)
        self.assertEqual(data["cancellation_rate"], 50.0)
        self.assertEqual(data["previous"]["total_revenue"], 50.0)            # days 7..13 ago only
        self.assertIsNone(self.client.get("/api/reports/sales/").data["previous"])

    def test_top_products_sorted_and_shared(self):
        order = self._order("A", Order.PAID, lines=())
        OrderItem.objects.create(order=order, product_id=1, product_name="Fridge", quantity=1, price=Decimal("300.00"), cost_price=Decimal("280.00"))
        OrderItem.objects.create(order=order, product_id=2, product_name="Kettle", quantity=5, price=Decimal("20.00"), cost_price=Decimal("5.00"))
        by_revenue = self.client.get("/api/reports/top-products/").data["products"]
        self.assertEqual([p["product_name"] for p in by_revenue], ["Fridge", "Kettle"])
        self.assertEqual(by_revenue[0]["revenue_share"], 75.0)
        by_margin = self.client.get("/api/reports/top-products/?sort=margin&limit=1").data["products"]
        self.assertEqual([(p["product_name"], p["margin"]) for p in by_margin], [("Kettle", 75.0)])
        self.assertEqual(self.client.get("/api/reports/top-products/?sort=price").status_code, 400)

    def test_abc_classes_follow_cumulative_revenue(self):
        order = self._order("A", Order.PAID, lines=())
        for pid, price in [(1, "700.00"), (2, "150.00"), (3, "100.00"), (4, "50.00")]:
            OrderItem.objects.create(order=order, product_id=pid, product_name=f"P{pid}", quantity=1, price=Decimal(price), cost_price=Decimal("1.00"))
        data = self.client.get("/api/reports/abc/").data
        # cumulative share before each product: 0, 70, 85, 95
        self.assertEqual([p["abc_class"] for p in data["products"]], ["A", "A", "B", "C"])
        self.assertEqual(data["products"][-1]["cumulative_share"], 100.0)
        self.assertEqual(data["classes"]["A"], {"products": 2, "revenue": 850.0, "revenue_share": 85.0})
        self.assertEqual(data["classes"]["C"]["products"], 1)

    def _history(self, order, steps, start_hours_ago):
        """steps: [(to_status, hours after creation)]; rewrites timestamps to fixed offsets."""
        base = timezone.now() - timedelta(hours=start_hours_ago)
        Order.objects.filter(pk=order.pk).update(created_at=base)
        prev = Order.UNPAID
        for to, hours in steps:
            row = OrderStatusHistory.objects.create(order=order, from_status=prev, to_status=to)
            OrderStatusHistory.objects.filter(pk=row.pk).update(changed_at=base + timedelta(hours=hours))
            prev = to

    def test_fulfillment_funnel_durations_and_cancel_stage(self):
        shipped = self._order("S", Order.DELIVERED)
        self._history(shipped, [(Order.PAID, 2), (Order.DELIVERING, 26), (Order.DELIVERED, 74)], 100)
        paid = self._order("P", Order.PAID)
        self._history(paid, [(Order.PAID, 4)], 10)
        dropped = self._order("X", Order.CANCELLED)
        self._history(dropped, [(Order.PAID, 1), (Order.CANCELLED, 3)], 10)
        self._order("U", Order.UNPAID)
        self._order("POS", Order.COMPLETED, channel=Order.OFFLINE)

        data = self.client.get("/api/reports/fulfillment/").data
        self.assertEqual(data["orders"], 4)
        self.assertEqual([f["count"] for f in data["funnel"]], [4, 3, 1, 1, 0])
        self.assertEqual(data["payment_conversion"], 75.0)
        self.assertEqual(data["cancelled"]["by_stage"]["paid"], 1)
        to_paid = data["durations"][0]
        self.assertEqual((to_paid["count"], to_paid["median_hours"]), (3, 2.0))
        self.assertEqual(data["durations"][1]["avg_hours"], 24.0)

    def test_status_change_is_recorded(self):
        order = _create_order(status=Order.UNPAID)
        svc.update_order_status(order, Order.PAID)
        self.assertEqual(
            list(order.status_history.values_list("from_status", "to_status")), [(Order.UNPAID, Order.PAID)]
        )

    def test_monthly_grouping_zero_fills_months(self):
        self._order("A", Order.PAID)
        first_of_month = self.today.replace(day=1)
        frm = (first_of_month - timedelta(days=40)).isoformat()
        data = self.client.get(f"/api/reports/daily-sales/?group=month&from={frm}&to={self.today.isoformat()}").data
        self.assertEqual(data["group"], "month")
        self.assertEqual(len(data["daily"]), 3)
        self.assertTrue(all(d["date"].endswith("-01") for d in data["daily"]))
        self.assertEqual([d["orders"] for d in data["daily"]], [0, 0, 1])
        self.assertEqual(data["daily"][-1]["revenue"], 200.0)

    @mock.patch("orders.reports.get_stock_valuation", return_value=(None, "connection refused"))
    def test_inventory_value_reports_unreachable_inventory(self, _):
        self.assertEqual(self.client.get("/api/reports/inventory-value/").status_code, 503)


class _FakeUrlopenResponse:
    """Minimal urllib response double: context manager exposing read()."""

    def __init__(self, payload):
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


class DeliveryApiTests(APITestCase):
    """Coverage for delivery proxy endpoints (Nova Poshta, Ukrposhta)."""

    NOVA_POSHTA_URL = "/api/orders/delivery/nova-poshta-warehouses/"
    UKRPOSHTA_URL = "/api/orders/delivery/ukrposhta-warehouses/"

    def setUp(self):
        self.client = APIClient()

    # --- Nova Poshta: mock path (no API key configured) ---

    @override_settings(NOVA_POSHTA_API_KEY="")
    def test_nova_poshta_mock_path_returns_warehouse_shape(self):
        response = self.client.post(
            self.NOVA_POSHTA_URL,
            {"city_name": "Київ"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(len(data), 3)
        for item in data:
            self.assertEqual(set(item.keys()), {"name", "ref", "address"})
            self.assertTrue(item["name"])
            self.assertTrue(item["ref"])
            self.assertTrue(item["address"])

    def test_nova_poshta_requires_city_name(self):
        response = self.client.post(self.NOVA_POSHTA_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nova_poshta_rejects_invalid_json(self):
        response = self.client.post(
            self.NOVA_POSHTA_URL,
            data="not json",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Nova Poshta: real path (API key configured, network mocked) ---

    @override_settings(NOVA_POSHTA_API_KEY="test-key")
    def test_nova_poshta_real_path_maps_raw_fields(self):
        payload = {
            "success": True,
            "data": [
                {
                    "Description": "Відділення №1",
                    "Ref": "ref-1",
                    "ShortAddress": "м. Київ, вул. Тестова, 1",
                }
            ],
        }
        with mock.patch(
            "urllib.request.urlopen",
            return_value=_FakeUrlopenResponse(payload),
        ) as urlopen:
            response = self.client.post(
                self.NOVA_POSHTA_URL,
                {"city_name": "Київ"},
                format="json",
            )
        urlopen.assert_called_once()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json()["data"],
            [
                {
                    "name": "Відділення №1",
                    "ref": "ref-1",
                    "address": "м. Київ, вул. Тестова, 1",
                }
            ],
        )
        sent = json.loads(urlopen.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(sent["apiKey"], "test-key")
        self.assertEqual(sent["methodProperties"]["CityName"], "Київ")

    @override_settings(NOVA_POSHTA_API_KEY="test-key")
    def test_nova_poshta_real_path_falls_back_to_generated_name(self):
        payload = {
            "success": True,
            "data": [
                {"Ref": "ref-short-address", "ShortAddress": "м. Львів, вул. Тестова, 2"},
                {"Ref": "ref-empty", "Description": "", "ShortAddress": ""},
            ],
        }
        with mock.patch(
            "urllib.request.urlopen",
            return_value=_FakeUrlopenResponse(payload),
        ):
            response = self.client.post(
                self.NOVA_POSHTA_URL,
                {"city_name": "Львів"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(data[0]["name"], "м. Львів, вул. Тестова, 2")
        self.assertEqual(data[1]["name"], "Відділення 2")
        self.assertEqual(data[1]["ref"], "ref-empty")
        self.assertEqual(data[1]["address"], "")

    @override_settings(NOVA_POSHTA_API_KEY="test-key")
    def test_nova_poshta_real_path_non_list_data_returns_empty_list(self):
        payload = {"success": True, "data": {"Description": "not a list"}}
        with mock.patch(
            "urllib.request.urlopen",
            return_value=_FakeUrlopenResponse(payload),
        ):
            response = self.client.post(
                self.NOVA_POSHTA_URL,
                {"city_name": "Київ"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["data"], [])

    @override_settings(NOVA_POSHTA_API_KEY="test-key")
    def test_nova_poshta_real_path_returns_502_on_url_error(self):
        with mock.patch(
            "urllib.request.urlopen",
            side_effect=URLError("boom"),
        ):
            response = self.client.post(
                self.NOVA_POSHTA_URL,
                {"city_name": "Київ"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.json()["error"], "<urlopen error boom>")

    # --- Ukrposhta (mock only) ---

    def test_ukrposhta_warehouses_shape(self):
        response = self.client.post(
            self.UKRPOSHTA_URL,
            {"city_name": "Київ"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(len(data), 2)
        for item in data:
            self.assertEqual(set(item.keys()), {"name", "address"})
            self.assertTrue(item["name"])
            self.assertTrue(item["address"])

    def test_ukrposhta_requires_city_name(self):
        response = self.client.post(self.UKRPOSHTA_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ukrposhta_rejects_invalid_json(self):
        response = self.client.post(
            self.UKRPOSHTA_URL,
            data="not json",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class _FakeInventory:
    """In-memory stand-in for inventory-service's stock endpoints (same rules, one request = one transaction)."""

    def __init__(self, stock):
        self.stock = stock

    def post(self, url, payload, headers):
        path = url.split("/api/", 1)[1]
        if path == "stock/deduct_batch/":
            return self._batch(payload)
        row = self.stock[payload["product_id"]]
        q = payload["quantity"]
        if path == "stock/deduct/":
            if row["quantity"] - row["reserved"] < q:
                return _FakeResponse(400, {"error": "Insufficient available stock"})
            row["reserved"] -= min(row["reserved"], q)
            row["quantity"] -= q
        elif path == "stock/release/":
            if row["reserved"] < q:
                return _FakeResponse(400, {"error": "Cannot release more than reserved"})
            row["reserved"] -= q
        return _FakeResponse(200, row)

    def _batch(self, payload):
        rows = {i["product_id"]: dict(self.stock[i["product_id"]]) for i in payload["items"]}
        for item in payload["items"]:
            row, q = rows[item["product_id"]], item["quantity"]
            if payload.get("from_reserved"):
                if row["reserved"] < q or row["quantity"] < q:
                    return _FakeResponse(400, {"error": "Insufficient reserved stock"})
                row["reserved"] -= q
            elif row["quantity"] - row["reserved"] < q:
                return _FakeResponse(400, {"error": "Insufficient available stock"})
            row["quantity"] -= q
        self.stock.update(rows)
        return _FakeResponse(200, {"items": list(rows.values())})


class _FakeResponse:
    def __init__(self, status_code, data):
        self.status_code, self._data = status_code, data

    def json(self):
        return self._data


class DeductCompensationTest(APITestCase):
    """A failed write-off of the 2nd item must leave the 1st item's stock untouched (fix #2)."""

    def setUp(self):
        user = User.objects.create_superuser("admin", "admin@test.com", "password123")
        self.client.force_authenticate(user=user)

    def test_failed_delivery_deduct_restores_first_item(self):
        inventory = _FakeInventory({1: {"quantity": 5, "reserved": 1}, 2: {"quantity": 0, "reserved": 1}})
        order = _create_order(status=Order.PAID, warehouse_id=1)
        _create_order_item(order, product_id=1, quantity=1)
        _create_order_item(order, product_id=2, quantity=1)
        with mock.patch("orders.inventory_client._post", side_effect=inventory.post):
            response = self.client.patch(f"/api/orders/{order.pk}/status/", {"status": "delivering"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.PAID)
        self.assertEqual(inventory.stock[1], {"quantity": 5, "reserved": 1})

    def test_delivering_ships_the_reserved_last_unit(self):
        inventory = _FakeInventory({1: {"quantity": 1, "reserved": 1}})
        order = _create_order(status=Order.PAID, warehouse_id=1)
        _create_order_item(order, product_id=1, quantity=1)
        with mock.patch("orders.inventory_client._post", side_effect=inventory.post):
            response = self.client.patch(f"/api/orders/{order.pk}/status/", {"status": "delivering"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(inventory.stock[1], {"quantity": 0, "reserved": 0})

    def test_failed_pos_deduct_restores_first_item(self):
        inventory = _FakeInventory({1: {"quantity": 5, "reserved": 2}, 2: {"quantity": 0, "reserved": 0}})
        with mock.patch("orders.inventory_client._post", side_effect=inventory.post):
            response = self.client.post("/api/orders/pos/", {
                "warehouse_id": 1, "customer_name": "POS",
                "items": [{"product_id": 1, "quantity": 1, "price": "10.00"},
                          {"product_id": 2, "quantity": 1, "price": "10.00"}],
            }, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(inventory.stock[1], {"quantity": 5, "reserved": 2})


class ReserveFailureCancellationTest(APITestCase):
    """A failed reservation cancels the order through update_order_status, so order.cancelled is published (fix #3)."""

    @mock.patch("orders.order_service.publish_event")
    @mock.patch("orders.views.release_stock", return_value=INVENTORY_OK)
    @mock.patch("orders.order_service.release_stock", return_value=INVENTORY_OK)
    @mock.patch("orders.order_service.reserve_stock", side_effect=[INVENTORY_OK, (None, "Insufficient available stock")])
    @mock.patch("orders.serializers.check_availability", return_value=(True, None))
    @mock.patch("orders.views.check_availability", return_value=(True, None))
    def test_failed_reserve_publishes_order_cancelled(self, _cv, _cs, _reserve, svc_release, view_release, publish):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/api/orders/", {
                "warehouse_id": 1, "customer_name": "John", "customer_email": "john@test.com",
                "items": [{"product_id": 1, "quantity": 1, "price": "10.00"},
                          {"product_id": 2, "quantity": 1, "price": "10.00"}],
            }, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        order = Order.objects.get()
        self.assertEqual(order.status, Order.CANCELLED)
        self.assertIn("Stock reservation failed", order.notes)
        self.assertIn("order.cancelled", [c.args[0] for c in publish.call_args_list])
        # only the reserved item is released, once; the item that was never reserved is left alone
        released = [c.kwargs["product_id"] for c in svc_release.call_args_list + view_release.call_args_list]
        self.assertEqual(released, [1])


class EventOutboxTest(TestCase):
    """Events RabbitMQ rejects are kept in the outbox and re-sent once it is back (fix #4)."""

    def test_failed_publish_is_queued_then_relayed(self):
        from shared_eventbus import outbox, publisher
        from shared_eventbus.models import OutboxEvent

        with mock.patch.object(publisher, "get_channel", side_effect=ConnectionError("broker down")), \
                mock.patch.object(outbox, "_ensure_relay") as relay_started:
            ok, _ = publisher.publish_event("order.created", {"event_id": "e1", "total": Decimal("9.99")})
        self.assertFalse(ok)
        relay_started.assert_called_once()
        self.assertEqual(OutboxEvent.objects.get().payload, {"event_id": "e1", "total": "9.99"})

        sent = []
        with mock.patch.object(publisher, "send", side_effect=lambda key, data, own_connection=False: sent.append((key, data))):
            self.assertEqual(outbox.relay_pending(), 0)
        self.assertEqual(sent, [("order.created", {"event_id": "e1", "total": "9.99"})])
        self.assertFalse(OutboxEvent.objects.exists())

    def test_relay_keeps_events_while_broker_is_down(self):
        from shared_eventbus import outbox, publisher
        from shared_eventbus.models import OutboxEvent

        OutboxEvent.objects.create(routing_key="order.created", payload={"event_id": "e2"})
        with mock.patch.object(publisher, "send", side_effect=ConnectionError("still down")):
            self.assertEqual(outbox.relay_pending(), 1)
        self.assertEqual(OutboxEvent.objects.get().attempts, 1)
