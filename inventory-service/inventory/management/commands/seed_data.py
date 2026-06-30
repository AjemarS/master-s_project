import logging
from datetime import date, timedelta
from decimal import Decimal
from random import randint, uniform

from django.core.management.base import BaseCommand
from django.db.models import F

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
        east, _ = Warehouse.objects.get_or_create(
            name="Склад Харків",
            defaults={"type": "warehouse", "address": "м. Харків, вул. Заводська 8", "is_active": True},
        )
        west, _ = Warehouse.objects.get_or_create(
            name="Склад Львів",
            defaults={"type": "warehouse", "address": "м. Львів, вул. Промислова 3", "is_active": True},
        )
        south, _ = Warehouse.objects.get_or_create(
            name="Шоурум Одеса",
            defaults={"type": "showroom", "address": "м. Одеса, вул. Дерибасівська 12", "is_active": True},
        )
        warehouses = [central, showroom, east, west, south]
        self.stdout.write(f"  Warehouses: {', '.join(w.name for w in warehouses)}")

        warehouse_stock_map = {
            central: 20,
            showroom: 3,
            east: 15,
            west: 12,
            south: 4,
        }
        for product_id in range(1, 26):
            for wh, qty in warehouse_stock_map.items():
                Stock.objects.get_or_create(
                    product_id=product_id,
                    warehouse=wh,
                    defaults={"quantity": qty, "reserved": 0},
                )
        self.stdout.write("  Stock levels created for 25 products across 5 warehouses")

        suppliers_data = [
            {"name": "ТОВ «ТехноПостач»", "contact": "Іван Петренко", "phone": "+380441234567", "email": "info@techopostach.ua", "address": "м. Київ, вул. Логістична 10"},
            {"name": "ПП «ЕлектроСвіт»", "contact": "Марія Коваль", "phone": "+380671112233", "email": "order@electrosvit.ua", "address": "м. Харків, вул. Енергетична 5"},
            {"name": "ТОВ «ПобутТехніка»", "contact": "Олег Сидоренко", "phone": "+380504445566", "email": "info@pobuttechnika.ua", "address": "м. Дніпро, вул. Індустріальна 20"},
            {"name": "\u00abSmartHome Distribution\u00bb", "contact": "Анна Шевченко", "phone": "+380937778899", "email": "sales@smarthome.ua", "address": "м. Київ, вул. Технологічна 7"},
            {"name": "ТОВ «КліматКонтроль»", "contact": "Дмитро Бойко", "phone": "+380633334455", "email": "info@klimatcontrol.ua", "address": "м. Львів, вул. Холодильна 15"},
        ]
        for s in suppliers_data:
            Supplier.objects.get_or_create(
                name=s["name"],
                defaults={
                    "contact_person": s["contact"],
                    "phone": s["phone"],
                    "email": s["email"],
                    "address": s["address"],
                },
            )
        self.stdout.write(f"  Suppliers: {len(suppliers_data)} created")

        grn_count = self._create_grns(central, suppliers_data)
        self.stdout.write(f"  GRNs created: {grn_count}")

        self.stdout.write(self.style.SUCCESS("Inventory seed data created"))

    def _create_grns(self, warehouse, suppliers_data):
        suppliers = list(Supplier.objects.all())
        if not suppliers:
            return 0

        # Product batches per GRN — products 1-3, 4-6, etc.
        grn_defs = [
            {"products": [1, 2, 3], "days_ago": 28, "supplier_idx": 0},
            {"products": [4, 5, 6], "days_ago": 24, "supplier_idx": 1},
            {"products": [7, 8, 9], "days_ago": 20, "supplier_idx": 0},
            {"products": [10, 11, 12, 13], "days_ago": 16, "supplier_idx": 2},
            {"products": [14, 15, 16], "days_ago": 12, "supplier_idx": 3},
            {"products": [17, 18, 19], "days_ago": 8, "supplier_idx": 1},
            {"products": [20, 21, 22], "days_ago": 4, "supplier_idx": 4},
            {"products": [23, 24, 25], "days_ago": 1, "supplier_idx": 0},
        ]

        count = 0
        for g in grn_defs:
            supplier = suppliers[g["supplier_idx"] % len(suppliers)]
            receipt_date = date.today() - timedelta(days=g["days_ago"])

            grn = GoodsReceiptNote.objects.create(
                supplier=supplier,
                warehouse=warehouse,
                receipt_date=receipt_date,
                reference_number=f"INV-{receipt_date.strftime('%Y%m%d')}-{randint(100, 999)}",
                notes=f"Seed GRN — {supplier.name}",
                created_by="seed",
            )

            for pid in g["products"]:
                qty = randint(5, 15)
                cost = Decimal(str(round(uniform(3000, 25000), 2)))

                GoodsReceiptItem.objects.create(
                    goods_receipt=grn,
                    product_id=pid,
                    quantity=qty,
                    cost_price=cost,
                )

                Stock.objects.filter(
                    product_id=pid, warehouse=warehouse
                ).update(quantity=F("quantity") + qty)

                StockMovement.objects.create(
                    product_id=pid,
                    to_warehouse=warehouse,
                    quantity=qty,
                    type=StockMovement.RECEIPT,
                    reference_type="goods_receipt",
                    reference_id=str(grn.pk),
                    notes=f"GRN #{grn.pk}: {qty} units @ {cost}",
                    created_by="seed",
                )

            count += 1

        return count
