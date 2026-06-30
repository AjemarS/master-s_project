from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from ..models import Category, Product

User = get_user_model()


def _create_sample_image(name="test.jpg") -> SimpleUploadedFile:
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


def _create_regular_user():
    return User.objects.create_user("regular", "regular@test.com", "password123")
