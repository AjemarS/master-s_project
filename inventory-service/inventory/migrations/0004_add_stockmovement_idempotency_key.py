from django.db import migrations, models


class Migration(migrations.Migration):
    """Add idempotency_key to StockMovement for dedup support."""

    dependencies = [
        ("inventory", "0003_stock_average_cost"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE inventory_stockmovement "
                        "ADD COLUMN IF NOT EXISTS idempotency_key "
                        "varchar(255) NOT NULL DEFAULT ''"
                    ),
                    reverse_sql=(
                        "ALTER TABLE inventory_stockmovement "
                        "DROP COLUMN idempotency_key"
                    ),
                ),
                migrations.RunSQL(
                    sql=(
                        "CREATE INDEX IF NOT EXISTS "
                        "inventory_s_idempot_fbde3e_idx "
                        "ON inventory_stockmovement (idempotency_key)"
                    ),
                    reverse_sql="DROP INDEX IF EXISTS inventory_s_idempot_fbde3e_idx",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="stockmovement",
                    name="idempotency_key",
                    field=models.CharField(
                        blank=True,
                        db_index=True,
                        default="",
                        max_length=255,
                        verbose_name="Ключ ідемпотентності",
                    ),
                ),
            ],
        ),
    ]
