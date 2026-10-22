from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from ..models import Category, Product
from .helpers import _create_category, _create_product


class CategoryModelTest(TestCase):
    def test_create_category(self):
        cat = _create_category("Electronics")
        self.assertEqual(cat.name, "Electronics")
        self.assertEqual(str(cat), "Electronics")

    def test_category_ordering(self):
        _create_category("Zebra")
        _create_category("Alpha")
        cats = list(Category.objects.all())
        self.assertEqual(cats[0].name, "Alpha")
        self.assertEqual(cats[-1].name, "Zebra")

    def test_unique_name(self):
        _create_category("Unique")
        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Unique")

    def test_product_count(self):
        cat = _create_category()
        _create_product(category=cat)
        _create_product(category=cat, name="Product 2")
        self.assertEqual(cat.products.count(), 2)


class ProductModelTest(TestCase):
    def test_create_product(self):
        cat = _create_category()
        product = _create_product(category=cat)
        self.assertEqual(str(product), "Test Product")
        self.assertEqual(product.category, cat)

    def test_in_stock_sync_on_save(self):
        product = _create_product(stock=5)
        self.assertTrue(product.in_stock)

        product.stock = 0
        product.save()
        product.refresh_from_db()
        self.assertFalse(product.in_stock)

    def test_product_ordering(self):
        cat = _create_category()
        p1 = _create_product(category=cat, name="A")
        p2 = _create_product(category=cat, name="B")
        products = list(Product.objects.all())
        self.assertEqual(products[0], p2)
        self.assertEqual(products[1], p1)

    def test_rating_constraints(self):
        cat = _create_category()
        product = Product(
            category=cat,
            name="Bad Rating",
            description="Test",
            price=Decimal("10.00"),
            original_price=Decimal("15.00"),
            rating=Decimal("5.1"),
        )
        with self.assertRaises(ValidationError):
            product.full_clean()

        product.rating = Decimal("-0.1")
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_price_non_negative(self):
        cat = _create_category()
        product = Product(
            category=cat,
            name="Negative Price",
            description="Test",
            price=Decimal("-1"),
        )
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_category_relation(self):
        cat = _create_category("Books")
        _create_product(category=cat, name="Book 1")
        _create_product(category=cat, name="Book 2")
        self.assertQuerySetEqual(
            cat.products.all(),
            Product.objects.filter(category=cat),
        )


class SubcategoryTest(TestCase):
    def setUp(self):
        self.parent = _create_category("Дрібна техніка")
        self.child = Category.objects.create(name="Кухонна техніка", parent=self.parent)
        self.own = _create_product(category=self.parent, name="Праска")
        self.nested = _create_product(category=self.child, name="Блендер")

    def test_parent_lists_its_subcategories_products(self):
        def listed(cat):
            res = self.client.get(f"/api/products/?category={cat.pk}").json()
            return {p["id"] for p in res["results"]}

        self.assertEqual(listed(self.parent), {self.own.pk, self.nested.pk})
        self.assertEqual(listed(self.child), {self.nested.pk})

    def test_parent_count_includes_subcategories(self):
        parent = self.client.get(f"/api/categories/{self.parent.pk}/").json()
        self.assertEqual(parent["product_count"], 2)

    def test_category_with_products_or_subcategories_is_not_deleted(self):
        admin = {"HTTP_X_GATEWAY_USER_ID": "adm", "HTTP_X_GATEWAY_USER_ROLE": "admin"}
        for cat in (self.parent, self.child):
            res = self.client.delete(f"/api/categories/{cat.pk}/", **admin)
            self.assertEqual(res.status_code, 400)
            self.assertEqual(res.json()["error"], "category_not_empty")
        self.assertEqual(Product.objects.count(), 2)
        empty = Category.objects.create(name="Порожня")
        res = self.client.delete(f"/api/categories/{empty.pk}/", **admin)
        self.assertEqual(res.status_code, 204)
