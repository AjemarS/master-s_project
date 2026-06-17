from django.db import models

class Cart(models.Model):
    user_id = models.CharField(max_length=255, db_index=True, verbose_name="ID користувача")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        verbose_name = "Кошик"
        verbose_name_plural = "Кошики"

    def __str__(self):
        return f"Cart({self.user_id})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("Product", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, verbose_name="Кількість")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Додано")

    class Meta:
        verbose_name = "Елемент кошика"
        verbose_name_plural = "Елементи кошика"
        unique_together = [("cart", "product")]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"