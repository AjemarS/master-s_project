from decimal import Decimal

from django.db import models


class Order(models.Model):
    ONLINE = "online"
    OFFLINE = "offline"
    CHANNEL_CHOICES = [
        (ONLINE, "Онлайн"),
        (OFFLINE, "Офлайн (POS)"),
    ]

    UNPAID = "unpaid"
    PAID = "paid"
    DELIVERING = "delivering"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (UNPAID, "Не сплачено"),
        (PAID, "Сплачено"),
        (DELIVERING, "В дорозі"),
        (DELIVERED, "Доставлено"),
        (COMPLETED, "Виконано"),
        (CANCELLED, "Скасовано"),
    ]

    STATUS_TRANSITIONS = {
        UNPAID: [PAID, CANCELLED],
        PAID: [DELIVERING, CANCELLED],
        DELIVERING: [DELIVERED, CANCELLED],
        DELIVERED: [COMPLETED, CANCELLED],
        COMPLETED: [],
        CANCELLED: [],
    }

    PAYMENT_UNPAID = "unpaid"
    PAYMENT_PAID = "paid"
    PAYMENT_REFUNDED = "refunded"
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_UNPAID, "Не оплачено"),
        (PAYMENT_PAID, "Оплачено"),
        (PAYMENT_REFUNDED, "Повернено"),
    ]

    order_number = models.CharField(
        max_length=50, unique=True, verbose_name="Номер замовлення"
    )
    channel = models.CharField(
        max_length=20, choices=CHANNEL_CHOICES, default=ONLINE, verbose_name="Канал"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=UNPAID, verbose_name="Статус"
    )
    warehouse_id = models.IntegerField(
        null=True, blank=True, verbose_name="ID складу виконання"
    )
    customer_name = models.CharField(
        max_length=200, blank=True, verbose_name="Ім'я покупця"
    )
    customer_phone = models.CharField(
        max_length=50, blank=True, verbose_name="Телефон покупця"
    )
    customer_email = models.EmailField(
        blank=True, verbose_name="Email покупця"
    )
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), verbose_name="Загальна сума"
    )
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_UNPAID, verbose_name="Статус оплати"
    )
    stripe_session_id = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Stripe Session ID"
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Stripe Payment Intent ID"
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата оплати")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_by = models.CharField(
        max_length=255, blank=True, verbose_name="Створено користувачем"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Замовлення"
        verbose_name_plural = "Замовлення"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["customer_email"]),
            models.Index(fields=["order_number"]),
        ]

    def __str__(self):
        return f"Order #{self.order_number}"

    def can_transition_to(self, new_status):
        allowed = self.STATUS_TRANSITIONS.get(self.status, [])
        return new_status in allowed


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items", verbose_name="Замовлення"
    )
    product_id = models.IntegerField(verbose_name="ID товару")
    product_name = models.CharField(
        max_length=200, blank=True, verbose_name="Назва товару"
    )
    quantity = models.PositiveIntegerField(verbose_name="Кількість")
    price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Ціна продажу"
    )
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"), verbose_name="Собівартість"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")

    class Meta:
        verbose_name = "Позиція замовлення"
        verbose_name_plural = "Позиції замовлень"

    def __str__(self):
        return f"{self.product_name or self.product_id} x{self.quantity}"
