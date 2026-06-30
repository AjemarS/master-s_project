from decimal import Decimal

from django.test import TestCase

from ..eventbus import _handle_goods_received, _handle_stock_changed
from ..models import Category, Product


class EventbusHandlerTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Appliances")
        self.product = Product.objects.create(
            name="Test Fridge",
            category=self.category,
            price=Decimal("999.99"),
            original_price=Decimal("1299.99"),
            stock=50,
            in_stock=True,
        )

    def test_handle_stock_changed_increments_stock(self):
        _handle_stock_changed({
            "product_id": self.product.pk,
            "change": 10,
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 60)
        self.assertTrue(self.product.in_stock)

    def test_handle_stock_changed_decrements_stock(self):
        _handle_stock_changed({
            "product_id": self.product.pk,
            "change": -20,
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 30)
        self.assertTrue(self.product.in_stock)

    def test_handle_stock_changed_sets_in_stock_false(self):
        _handle_stock_changed({
            "product_id": self.product.pk,
            "change": -50,
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertFalse(self.product.in_stock)

    def test_handle_stock_changed_missing_product_id(self):
        _handle_stock_changed({"change": 10})
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)

    def test_handle_goods_received_increments_stock(self):
        _handle_goods_received({
            "product_id": self.product.pk,
            "quantity": 15,
            "cost_price": "8500.00",
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 65)
        self.assertTrue(self.product.in_stock)

    def test_handle_goods_received_sets_in_stock_false(self):
        self.product.stock = 5
        self.product.save()
        _handle_goods_received({
            "product_id": self.product.pk,
            "quantity": -5,
            "cost_price": "0",
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertFalse(self.product.in_stock)

    def test_handle_goods_received_missing_product_id(self):
        _handle_goods_received({"quantity": 10, "cost_price": "1000"})
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 50)
