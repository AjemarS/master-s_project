from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Назва")
    name_uk = models.CharField(max_length=100, blank=True, verbose_name="Назва (укр)")
    name_en = models.CharField(max_length=100, blank=True, verbose_name="Назва (англ)")
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="children", verbose_name="Батьківська категорія"
    )
    image = models.ImageField(
        upload_to="category_images/",
        blank=True,
        null=True,
        verbose_name="Зображення категорій",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Категорія"
        verbose_name_plural = "Категорії"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, verbose_name="Назва продукту")
    name_uk = models.CharField(max_length=200, blank=True, verbose_name="Назва (укр)")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="Назва (англ)")
    description = models.TextField(verbose_name="Опис")
    description_uk = models.TextField(blank=True, verbose_name="Опис (укр)")
    description_en = models.TextField(blank=True, verbose_name="Опис (англ)")

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="Категорія",
    )

    brand = models.CharField(max_length=100, blank=True, verbose_name="Бренд")
    color = models.CharField(max_length=50, blank=True, verbose_name="Колір")
    is_on_sale = models.BooleanField(default=False, verbose_name="Акційний")

    features = models.JSONField(default=list, verbose_name="Особливості")

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Поточна ціна",
    )
    # db_column preserves the existing column name so no migration is needed
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Початкова ціна",
        db_column="originalPrice",
    )
    stock = models.PositiveIntegerField(default=0, verbose_name="Кількість на складі")
    in_stock = models.BooleanField(
        default=True,
        verbose_name="В наявності",
        db_column="inStock",
    )
    image = models.ImageField(
        upload_to="product_images/",
        blank=True,
        null=True,
        verbose_name="Зображення продукту",
    )
    rating = models.DecimalField(
        default=Decimal("0.0"),
        decimal_places=1,
        max_digits=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Рейтинг",
    )
    specs = models.JSONField(default=dict, verbose_name="Специфікації")
    slug = models.SlugField(max_length=200, unique=True, blank=True, verbose_name="URL-ідентифікатор")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Продукт"
        verbose_name_plural = "Продукти"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Keep in_stock in sync with stock count
        self.in_stock = self.stock > 0
        self.is_on_sale = self.original_price > 0 and Decimal(str(self.original_price)) > Decimal(str(self.price))
        if not self.slug:
            base_slug = slugify(self.name_en or self.name or "")
            if not base_slug:
                base_slug = f"product-{self.id or 'new'}"
            self.slug = base_slug
            # Ensure uniqueness
            counter = 1
            while Product.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class ProcessedEvent(models.Model):
    event_id = models.CharField(
        max_length=255, unique=True, verbose_name="ID події"
    )
    processed_at = models.DateTimeField(auto_now_add=True, verbose_name="Оброблено")

    class Meta:
        verbose_name = "Оброблена подія"
        verbose_name_plural = "Оброблені події"

    def __str__(self):
        return self.event_id
