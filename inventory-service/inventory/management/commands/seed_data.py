import logging

from django.core.management.base import BaseCommand

from inventory.models import (
    GoodsReceiptItem,
    GoodsReceiptNote,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed inventory service with demo data"

    def handle(self, *args, **options):
        central, _ = Warehouse.objects.get_or_create(
            name="Центральний склад",
            defaults={"type": "warehouse", "address": "м. Київ, вул. Промислова 15", "is_active": True},
        )
        showroom, _ = Warehouse.objects.get_or_create(
            name="Шоурум Київ",
            defaults={"type": "showroom", "address": "м. Київ, вул. Хрещатик 25", "is_active": True},
        )
        self.stdout.write(f"  Warehouses: {central.name}, {showroom.name}")

        for product_id in range(1, 26):
            Stock.objects.get_or_create(
                product_id=product_id,
                warehouse=central,
                defaults={"quantity": 20, "reserved": 0},
            )
            Stock.objects.get_or_create(
                product_id=product_id,
                warehouse=showroom,
                defaults={"quantity": 3, "reserved": 0},
            )
        self.stdout.write("  Stock levels created for 25 products across 2 warehouses")

        supplier, _ = Supplier.objects.get_or_create(
            name="ТОВ «ТехноПостач»",
            defaults={
                "contact_person": "Іван Петренко",
                "phone": "+380441234567",
                "email": "info@techopostach.ua",
                "address": "м. Київ, вул. Логістична 10",
            },
        )
        self.stdout.write(f"  Supplier: {supplier.name}")

        self.stdout.write(self.style.SUCCESS("Inventory seed data created"))
