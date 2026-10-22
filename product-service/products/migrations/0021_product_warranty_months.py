import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0020_product_is_on_sale"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="warranty_months",
            field=models.PositiveSmallIntegerField(
                default=12,
                validators=[django.core.validators.MaxValueValidator(120)],
                verbose_name="Гарантія, міс.",
            ),
        ),
    ]
