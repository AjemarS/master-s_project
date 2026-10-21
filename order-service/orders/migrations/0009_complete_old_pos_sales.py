from django.db import migrations
from django.db.models import F


def complete_old_pos_sales(apps, schema_editor):
    # POS sales made before the till completed them were left unpaid although the buyer paid and took the goods.
    # No status-history rows: they would be stamped now and skew the time-in-status analytics.
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(channel="offline", status="unpaid", payment_status="unpaid").update(
        status="completed", payment_status="paid", paid_at=F("created_at"), delivered_at=F("created_at")
    )


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_promo_codes"),
    ]

    operations = [
        migrations.RunPython(complete_old_pos_sales, migrations.RunPython.noop),
    ]
