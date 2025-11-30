from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import ArrayField


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Назва")

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
    description = models.TextField(verbose_name="Опис")

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="Категорія",
    )

    features = models.JSONField(
        default=list,
        verbose_name="Особливості",
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Поточна ціна",
    )
    originalPrice = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Початкова ціна",
    )

    inStock = models.BooleanField(default=True, verbose_name="В наявності")
    image = models.ImageField(
        upload_to="product_images/", blank=True, null=True, verbose_name="Зображення"
    )

    rating = models.DecimalField(
        default=0.0,
        decimal_places=1,
        max_digits=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Рейтинг",
    )

    specs = models.JSONField(default=dict, verbose_name="Специфікації")

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
