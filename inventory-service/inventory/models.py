from django.db import models


class Warehouse(models.Model):
    WAREHOUSE = "warehouse"
    SHOWROOM = "showroom"
    TYPE_CHOICES = [
        (WAREHOUSE, "Склад"),
        (SHOWROOM, "Шоурум"),
    ]

    name = models.CharField(max_length=200, verbose_name="Назва")
    type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=WAREHOUSE, verbose_name="Тип"
    )
    address = models.TextField(blank=True, verbose_name="Адреса")
    is_active = models.BooleanField(default=True, verbose_name="Активний")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Склад"
        verbose_name_plural = "Склади"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=200, verbose_name="Назва")
    contact_person = models.CharField(
        max_length=200, blank=True, verbose_name="Контактна особа"
    )
    phone = models.CharField(max_length=50, blank=True, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Адреса")
    is_active = models.BooleanField(default=True, verbose_name="Активний")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Постачальник"
        verbose_name_plural = "Постачальники"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Stock(models.Model):
    product_id = models.IntegerField(verbose_name="ID товару")
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.CASCADE, related_name="stocks", verbose_name="Склад"
    )
    quantity = models.IntegerField(default=0, verbose_name="Кількість")
    reserved = models.IntegerField(default=0, verbose_name="Зарезервовано")
    average_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Середня собівартість"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Залишок"
        verbose_name_plural = "Залишки"
        unique_together = [("product_id", "warehouse")]
        indexes = [
            models.Index(fields=["product_id"]),
            models.Index(fields=["warehouse"]),
        ]

    def __str__(self):
        return f"Product {self.product_id} @ {self.warehouse.name}: {self.quantity}"

    @property
    def available(self):
        return self.quantity - self.reserved


class StockMovement(models.Model):
    RECEIPT = "receipt"
    TRANSFER = "transfer"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    WRITE_OFF = "write_off"
    RESERVE = "reserve"
    RELEASE = "release"
    DEDUCT = "deduct"

    TYPE_CHOICES = [
        (RECEIPT, "Оприбуткування"),
        (TRANSFER, "Переміщення"),
        (SALE, "Продаж"),
        (ADJUSTMENT, "Коригування"),
        (WRITE_OFF, "Списання"),
        (RESERVE, "Резервування"),
        (RELEASE, "Повернення резерву"),
        (DEDUCT, "Списання залишку"),
    ]

    product_id = models.IntegerField(verbose_name="ID товару")
    from_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movements_from",
        verbose_name="Зі складу",
    )
    to_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movements_to",
        verbose_name="На склад",
    )
    quantity = models.IntegerField(verbose_name="Кількість")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Тип")
    reference_type = models.CharField(
        max_length=50, blank=True, verbose_name="Тип документа"
    )
    reference_id = models.CharField(
        max_length=50, blank=True, verbose_name="ID документа"
    )
    idempotency_key = models.CharField(max_length=255, blank=True, default="", db_index=True, verbose_name="Ключ ідемпотентності")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_by = models.CharField(
        max_length=255, blank=True, verbose_name="Створено користувачем"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")

    class Meta:
        verbose_name = "Рух товару"
        verbose_name_plural = "Рухи товару"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product_id"]),
            models.Index(fields=["type"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["idempotency_key"]),
        ]

    def __str__(self):
        return f"{self.get_type_display()} | Product {self.product_id} x{self.quantity}"


class GoodsReceiptNote(models.Model):
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="goods_receipts",
        verbose_name="Постачальник",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="goods_receipts",
        verbose_name="Склад",
    )
    receipt_date = models.DateField(verbose_name="Дата оприбуткування")
    reference_number = models.CharField(
        max_length=100, blank=True, verbose_name="Номер документа"
    )
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_by = models.CharField(
        max_length=255, blank=True, verbose_name="Створено користувачем"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Накладна оприбуткування"
        verbose_name_plural = "Накладні оприбуткування"
        ordering = ["-created_at"]

    def __str__(self):
        return f"GRN #{self.pk} - {self.supplier.name}"


class GoodsReceiptItem(models.Model):
    goods_receipt = models.ForeignKey(
        GoodsReceiptNote,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Накладна",
    )
    product_id = models.IntegerField(verbose_name="ID товару")
    quantity = models.PositiveIntegerField(verbose_name="Кількість")
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Собівартість"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")

    class Meta:
        verbose_name = "Позиція накладної"
        verbose_name_plural = "Позиції накладних"

    def __str__(self):
        return f"Product {self.product_id} x{self.quantity} @ {self.cost_price}"


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
