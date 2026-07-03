from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_stock_average_cost"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockmovement",
            name="idempotency_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=255,
                verbose_name="Ідемпотенційний ключ",
            ),
        ),
    ]
