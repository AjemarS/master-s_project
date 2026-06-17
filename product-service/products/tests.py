"""
Comprehensive test suite for the products app.

Covers models, serializers, views (CRUD + custom actions), filters,
pagination, authentication, and cart operations.
"""

from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .cart_models import Cart, CartItem
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

User = get_user_model()

# =============================================================================
#  Helpers
# =============================================================================


def _create_sample_image(name="test.jpg") -> SimpleUploadedFile:
    """Return a small in-memory JPEG image."""
    img = Image.new("RGB", (100, 100), color=(255, 0, 0))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type="image/jpeg")


def _create_category(name="Test Category") -> Category:
    return Category.objects.create(name=name)


def _create_product(
    category: Category | None = None,
    name="Test Product",
    price=Decimal("99.99"),
    stock=10,
    rating=Decimal("4.5"),
    **kwargs,
) -> Product:
    if category is None:
        category = _create_category()
    return Product.objects.create(
        category=category,
        name=name,
        description="A test product description.",
        price=price,
        original_price=Decimal("129.99"),
        stock=stock,
        rating=rating,
        **kwargs,
    )


def _create_admin_user():
    return User.objects.create_superuser("admin", "admin@test.com", "password123")


# =============================================================================
#  Model Tests
# =============================================================================


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
        """in_stock should be True when stock > 0, False when stock == 0."""
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
        # Default ordering is -created_at (most recent first)
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


# =============================================================================
#  Serializer Tests
# =============================================================================


class CategorySerializerTest(TestCase):
    def test_valid_data(self):
        serializer = CategorySerializer(data={"name": "Valid Category"})
        self.assertTrue(serializer.is_valid(), msg=serializer.errors)

    def test_blank_name(self):
        serializer = CategorySerializer(data={"name": ""})
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_whitespace_name(self):
        serializer = CategorySerializer(data={"name": "   "})
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_product_count_field(self):
        cat = _create_category()
        _create_product(category=cat)
        serializer = CategorySerializer(cat)
        self.assertEqual(serializer.data["product_count"], 1)

    def test_name_max_length(self):
        serializer = CategorySerializer(data={"name": "x" * 101})
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)


class ProductSerializerTest(TestCase):
    def setUp(self):
        self.cat = _create_category()
        self.valid_payload = {
            "name": "Test Product",
            "description": "A great product",
            "category": self.cat.pk,
            "price": "49.99",
            "original_price": "79.99",
            "stock": 10,
            "features": ["feature1", "feature2"],
            "specs": {"color": "red", "weight": "1kg"},
            "rating": "4.5",
        }

    def test_valid_data(self):
        serializer = ProductSerializer(data=self.valid_payload)
        self.assertTrue(serializer.is_valid(), msg=serializer.errors)

    def test_blank_name(self):
        payload = {**self.valid_payload, "name": ""}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_blank_description(self):
        payload = {**self.valid_payload, "description": ""}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("description", serializer.errors)

    def test_negative_stock(self):
        payload = {**self.valid_payload, "stock": -5}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("stock", serializer.errors)

    def test_rating_out_of_range(self):
        payload = {**self.valid_payload, "rating": "5.5"}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("rating", serializer.errors)

    def test_features_must_be_list(self):
        payload = {**self.valid_payload, "features": "not-a-list"}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("features", serializer.errors)

    def test_features_items_must_be_strings(self):
        payload = {**self.valid_payload, "features": [1, 2, 3]}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("features", serializer.errors)

    def test_specs_must_be_dict(self):
        payload = {**self.valid_payload, "specs": ["not-a-dict"]}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("specs", serializer.errors)

    def test_original_price_less_than_current(self):
        payload = {**self.valid_payload, "original_price": "10.00", "price": "50.00"}
        serializer = ProductSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("original_price", serializer.errors)

    def test_original_price_equal_to_current(self):
        payload = {**self.valid_payload, "original_price": "50.00", "price": "50.00"}
        serializer = ProductSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), msg=serializer.errors)

    def test_category_name_read_only(self):
        product = _create_product(category=self.cat)
        serializer = ProductSerializer(product)
        self.assertEqual(serializer.data["category_name"], self.cat.name)

    def test_in_stock_read_only(self):
        payload = {**self.valid_payload, "in_stock": False}
        serializer = ProductSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), msg=serializer.errors)
        # in_stock should be computed from stock at model level
        self.assertNotIn("in_stock", serializer.validated_data)


# =============================================================================
#  View / API Tests
# =============================================================================


class ProductAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = _create_category()
        self.product = _create_product(category=self.cat)
        self.list_url = "/api/products/"
        self.detail_url = f"/api/products/{self.product.pk}/"

    # --- List ---

    def test_list_products(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)

    def test_list_returns_category_name(self):
        response = self.client.get(self.list_url)
        result = response.data["results"][0]
        self.assertIn("category_name", result)
        self.assertEqual(result["category_name"], self.cat.name)

    def test_list_pagination_default(self):
        for i in range(25):
            _create_product(category=self.cat, name=f"Product {i}")
        response = self.client.get(self.list_url)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertEqual(response.data["count"], 26)  # 1 existing + 25 new

    # --- Retrieve ---

    def test_retrieve_product(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.product.name)

    def test_retrieve_nonexistent(self):
        response = self.client.get("/api/products/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Create (admin only) ---

    def test_create_requires_admin(self):
        payload = {
            "name": "New",
            "description": "Desc",
            "category": self.cat.pk,
            "price": "10.00",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_as_admin(self):
        admin = _create_admin_user()
        self.client.force_authenticate(admin)
        payload = {
            "name": "Admin Created",
            "description": "Created by admin",
            "category": self.cat.pk,
            "price": "29.99",
            "original_price": "39.99",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)

    # --- Update (admin only) ---

    def test_update_requires_admin(self):
        response = self.client.patch(self.detail_url, {"name": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_as_admin(self):
        admin = _create_admin_user()
        self.client.force_authenticate(admin)
        response = self.client.patch(self.detail_url, {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Updated")

    # --- Delete (admin only) ---

    def test_delete_requires_admin(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_as_admin(self):
        admin = _create_admin_user()
        self.client.force_authenticate(admin)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)

    # --- Filtering ---

    def test_filter_by_category(self):
        cat2 = _create_category("Other")
        _create_product(category=cat2, name="Other Product")
        response = self.client.get(self.list_url, {"category": self.cat.pk})
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.product.pk)

    def test_filter_by_name(self):
        _create_product(category=self.cat, name="Unique Widget")
        response = self.client.get(self.list_url, {"search": "Unique"})
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Unique Widget")

    def test_filter_by_price_range(self):
        _create_product(category=self.cat, name="Cheap", price=Decimal("5.00"))
        _create_product(category=self.cat, name="Expensive", price=Decimal("500.00"))
        response = self.client.get(self.list_url, {"min_price": "10", "max_price": "100"})
        for r in response.data["results"]:
            price = Decimal(r["price"])
            self.assertGreaterEqual(price, Decimal("10"))
            self.assertLessEqual(price, Decimal("100"))

    # --- Custom actions ---

    def test_low_stock(self):
        _create_product(category=self.cat, name="Low", stock=3)
        response = self.client.get("/api/products/low_stock/", {"threshold": "5"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertTrue(all(Decimal(r["stock"]) <= 5 for r in results))

    def test_low_stock_invalid_threshold(self):
        response = self.client.get("/api/products/low_stock/", {"threshold": "-1"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_by_category(self):
        cat2 = _create_category("Target")
        _create_product(category=cat2, name="In Target Cat", stock=10)
        response = self.client.get("/api/products/by_category/", {"category_id": cat2.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "In Target Cat")

    def test_by_category_nonexistent(self):
        response = self.client.get("/api/products/by_category/", {"category_id": 99999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_by_category_missing_param(self):
        response = self.client.get("/api/products/by_category/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
#  Cart API Tests
# =============================================================================


class CartAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = _create_category()
        self.product = _create_product(category=self.cat)
        self.user_id = "test-user-123"
        # Simulate gateway-proxied request headers
        self.auth_headers = {
            "HTTP_X_GATEWAY_USER_ID": self.user_id,
            "HTTP_X_GATEWAY_USER_ROLE": "user",
        }

    def _cart_url(self) -> str:
        return "/api/cart/"

    # --- List / get cart ---

    def test_get_cart_creates_new_cart(self):
        self.assertEqual(Cart.objects.count(), 0)
        response = self.client.get(self._cart_url(), **self.auth_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Cart.objects.count(), 1)

    def test_get_cart_without_auth(self):
        response = self.client.get(self._cart_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_cart_returns_items(self):
        cart = Cart.objects.create(user_id=self.user_id)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        response = self.client.get(self._cart_url(), **self.auth_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["product_name"], self.product.name)
        self.assertEqual(response.data["items"][0]["quantity"], 2)

    # --- Add item ---

    def test_add_item(self):
        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"product_id": self.product.pk, "quantity": 3},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cart = Cart.objects.get(user_id=self.user_id)
        self.assertEqual(cart.items.count(), 1)
        item = cart.items.first()
        self.assertEqual(item.quantity, 3)

    def test_add_item_without_auth(self):
        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"product_id": self.product.pk, "quantity": 1},
            format="json",
        )
        # IsAuthenticatedOrReadOnly blocks anonymous POST with 403
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_add_item_nonexistent_product(self):
        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"product_id": 99999, "quantity": 1},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_item_no_product_id(self):
        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"quantity": 1},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_twice_increments_quantity(self):
        cart = Cart.objects.create(user_id=self.user_id)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"product_id": self.product.pk, "quantity": 2},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = CartItem.objects.get(cart=cart, product=self.product)
        self.assertEqual(item.quantity, 3)  # 1 + 2

    # --- Cart total ---

    def test_cart_total(self):
        cart = Cart.objects.create(user_id=self.user_id)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        # product price is Decimal('99.99'), so 2 * 99.99 = 199.98
        response = self.client.get(self._cart_url(), **self.auth_headers)
        self.assertEqual(Decimal(response.data["total"]), Decimal("199.98"))
        self.assertEqual(response.data["item_count"], 2)

    # --- Quantity validation ---

    def test_add_item_zero_quantity_not_allowed(self):
        response = self.client.post(
            f"{self._cart_url()}add_item/",
            {"product_id": self.product.pk, "quantity": 0},
            format="json",
            **self.auth_headers,
        )
        # The view clamps quantity < 1, so it should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

