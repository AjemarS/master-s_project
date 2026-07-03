from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_delivery_method_order_shipping_address_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrderSagaState",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "step",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("reserving", "Reserving Stock"),
                            ("reserved", "Stock Reserved"),
                            ("deducting", "Deducting Stock"),
                            ("deducted", "Stock Deducted"),
                            ("releasing", "Releasing Stock"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=20,
                        verbose_name="Крок саги",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        default="pending", max_length=20, verbose_name="Статус кроку"
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True, default="", verbose_name="Помилка"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Створено"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Оновлено"),
                ),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="saga_states",
                        to="orders.order",
                        verbose_name="Замовлення",
                    ),
                ),
            ],
            options={
                "verbose_name": "Стан саги",
                "verbose_name_plural": "Стани саги",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(
                fields=["created_at"], name="orders_orde_created_57c52d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(
                fields=["warehouse_id"], name="orders_orde_warehou_27041a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="ordersagastate",
            index=models.Index(
                fields=["order", "step"],
                name="orders_orde_order_i_d75e11_idx",
            ),
        ),
    ]
