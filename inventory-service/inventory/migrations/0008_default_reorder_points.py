from django.db import migrations

# Same values the seed uses; only stock lines nobody configured (point and batch both 0) get them
DEFAULTS = {"warehouse": (3, 15), "showroom": (1, 3)}


def set_default_reorder_points(apps, schema_editor):
    Stock = apps.get_model("inventory", "Stock")
    for wh_type, (point, batch) in DEFAULTS.items():
        Stock.objects.filter(warehouse__type=wh_type, reorder_point=0, reorder_quantity=0).update(
            reorder_point=point, reorder_quantity=batch
        )


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0007_purchase_orders"),
    ]

    operations = [
        migrations.RunPython(set_default_reorder_points, migrations.RunPython.noop),
    ]
