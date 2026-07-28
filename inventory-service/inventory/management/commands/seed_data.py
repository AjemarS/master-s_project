import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from random import randint, choice, sample, uniform

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from inventory.models import (
    ActivityEvent,
    GoodsReceiptItem,
    GoodsReceiptNote,
    ProcessedEvent,
    Stock,
    StockMovement,
    Supplier,
    Warehouse,
)

logger = logging.getLogger(__name__)

WAREHOUSE_DEFS = [
    {"name": "Центральний склад", "type": "warehouse", "address": "м. Київ, вул. Промислова 15"},
    {"name": "Шоурум Київ", "type": "showroom", "address": "м. Київ, вул. Хрещатик 25"},
    {"name": "Склад Харків", "type": "warehouse", "address": "м. Харків, вул. Заводська 8"},
    {"name": "Склад Львів", "type": "warehouse", "address": "м. Львів, вул. Промислова 3"},
    {"name": "Шоурум Одеса", "type": "showroom", "address": "м. Одеса, вул. Дерибасівська 12"},
]

SUPPLIERS_DATA = [
    {"name": "ТОВ «ТехноПостач»", "contact": "Іван Петренко", "phone": "+380441234567", "email": "info@techopostach.ua", "address": "м. Київ, вул. Логістична 10"},
    {"name": "ПП «ЕлектроСвіт»", "contact": "Марія Коваль", "phone": "+380671112233", "email": "order@electrosvit.ua", "address": "м. Харків, вул. Енергетична 5"},
    {"name": "ТОВ «ПобутТехніка»", "contact": "Олег Сидоренко", "phone": "+380504445566", "email": "info@pobuttechnika.ua", "address": "м. Дніпро, вул. Індустріальна 20"},
    {"name": "«SmartHome Distribution»", "contact": "Анна Шевченко", "phone": "+380937778899", "email": "sales@smarthome.ua", "address": "м. Київ, вул. Технологічна 7"},
    {"name": "ТОВ «КліматКонтроль»", "contact": "Дмитро Бойко", "phone": "+380633334455", "email": "info@klimatcontrol.ua", "address": "м. Львів, вул. Холодильна 15"},
]

WAREHOUSE_INITIAL_STOCK = [8, 2, 5, 4, 1]  # central, showroom, east, west, south

WRITE_OFF_REASONS = [
    "Пошкоджено при транспортуванні",
    "Шлюб виробництва",
    "Втрачено на складі",
    "Повернення від клієнта з пошкодженням",
]


class Command(BaseCommand):
    help = "Seed inventory service with dynamic time-aware demo data covering 60 days of history"

    def handle(self, *args, **options):
        self._clear_seed_data()
        warehouses = self._create_warehouses()
        suppliers = self._create_suppliers()
        self._create_initial_stock(warehouses)
        grn_count, transfer_count, writeoff_count, sale_count = self._process_events(
            warehouses, suppliers
        )
        self.stdout.write(self.style.SUCCESS(
            f"Inventory seed data created: "
            f"GRNs={grn_count}, transfers={transfer_count}, "
            f"write-offs={writeoff_count}, sales={sale_count}"
        ))

    def _clear_seed_data(self):
        self.stdout.write("Clearing existing seed data...")
        ActivityEvent.objects.all().delete()
        GoodsReceiptItem.objects.all().delete()
        GoodsReceiptNote.objects.all().delete()
        StockMovement.objects.all().delete()
        Stock.objects.all().delete()
        ProcessedEvent.objects.all().delete()

    def _create_warehouses(self):
        warehouses = []
        for wd in WAREHOUSE_DEFS:
            wh, _ = Warehouse.objects.get_or_create(
                name=wd["name"],
                defaults={"type": wd["type"], "address": wd["address"], "is_active": True},
            )
            warehouses.append(wh)
        self.stdout.write(f"  Warehouses: {', '.join(w.name for w in warehouses)}")
        return warehouses

    def _create_suppliers(self):
        for s in SUPPLIERS_DATA:
            Supplier.objects.get_or_create(
                name=s["name"],
                defaults={
                    "contact_person": s["contact"],
                    "phone": s["phone"],
                    "email": s["email"],
                    "address": s["address"],
                },
            )
        suppliers = list(Supplier.objects.all())
        self.stdout.write(f"  Suppliers: {len(suppliers)}")
        return suppliers

    def _create_initial_stock(self, warehouses):
        for idx, wh in enumerate(warehouses):
            base_qty = WAREHOUSE_INITIAL_STOCK[idx]
            for product_id in range(1, 51):
                Stock.objects.get_or_create(
                    product_id=product_id,
                    warehouse=wh,
                    defaults={"quantity": base_qty, "reserved": 0},
                )
        self.stdout.write("  Initial stock levels created for 50 products across 5 warehouses")

    def _build_events(self, warehouses, suppliers):
        events = []

        # 20 GRNs spread across 60-day window
        for _ in range(20):
            days_ago = randint(1, 60)
            num_products = randint(2, 4)
            product_ids = sample(range(1, 32), num_products)
            qtys = [randint(5, 15) for _ in range(num_products)]
            costs = [Decimal(str(round(uniform(3000, 25000), 2))) for _ in range(num_products)]
            events.append({
                "type": "grn",
                "days_ago": days_ago,
                "warehouse": choice(warehouses),
                "supplier": choice(suppliers),
                "product_ids": product_ids,
                "qtys": qtys,
                "costs": costs,
            })

        # 10 transfers spread across the period
        for _ in range(10):
            from_wh = choice(warehouses)
            to_wh = choice([w for w in warehouses if w != from_wh])
            events.append({
                "type": "transfer",
                "days_ago": randint(3, 55),
                "from_warehouse": from_wh,
                "to_warehouse": to_wh,
                "product_id": randint(1, 31),
                "qty": randint(3, 8),
            })

        # 4 write-offs with distinct reasons
        for i in range(4):
            events.append({
                "type": "write_off",
                "days_ago": randint(3, 50),
                "warehouse": choice(warehouses),
                "product_id": randint(1, 31),
                "qty": randint(1, 3),
                "reason": WRITE_OFF_REASONS[i],
            })

        # 50 sales — prefer central and showrooms for realistic order fulfillment
        for _ in range(50):
            events.append({
                "type": "sale",
                "days_ago": randint(1, 50),
                "warehouse": choice(warehouses[:3]),  # central, showroom Kyiv, Kharkiv
                "product_id": randint(1, 25),
                "qty": randint(1, 2),
            })

        # Oldest first
        events.sort(key=lambda e: e["days_ago"], reverse=True)
        return events

    def _process_events(self, warehouses, suppliers):
        events = self._build_events(warehouses, suppliers)
        grn_count = 0
        transfer_count = 0
        writeoff_count = 0
        sale_count = 0

        for event in events:
            event_type = event["type"]
            if event_type == "grn":
                self._process_grn(event)
                grn_count += 1
            elif event_type == "transfer":
                self._process_transfer(event)
                transfer_count += 1
            elif event_type == "write_off":
                if self._process_writeoff(event):
                    writeoff_count += 1
            elif event_type == "sale":
                if self._process_sale(event):
                    sale_count += 1

        counts = f"GRNs={grn_count}, transfers={transfer_count}, write-offs={writeoff_count}, sales={sale_count}"
        self.stdout.write(f"  Events processed: {counts}")
        return grn_count, transfer_count, writeoff_count, sale_count

    @staticmethod
    def _event_datetime(days_ago):
        op_date = date.today() - timedelta(days=days_ago)
        op_datetime = datetime.combine(
            op_date, time(hour=randint(8, 18), minute=randint(0, 59))
        )
        return timezone.make_aware(op_datetime)

    @staticmethod
    def _create_activity_event(event_type, message, entity_type, entity_id, created_at):
        event = ActivityEvent.objects.create(
            event_type=event_type,
            message=message,
            entity_type=entity_type,
            entity_id=str(entity_id),
            user_name="Seed Data",
            user_email="seed@techhub.local",
        )
        # Override auto_now_add to match the historical operation date
        ActivityEvent.objects.filter(pk=event.pk).update(created_at=created_at)
        return event

    def _process_grn(self, event):
        wh = event["warehouse"]
        supplier = event["supplier"]
        days_ago = event["days_ago"]
        receipt_date = date.today() - timedelta(days=days_ago)
        event_dt = self._event_datetime(days_ago)

        grn = GoodsReceiptNote.objects.create(
            supplier=supplier,
            warehouse=wh,
            receipt_date=receipt_date,
            reference_number=f"INV-{receipt_date.strftime('%Y%m%d')}-{randint(1000, 9999)}",
            notes=f"Seed GRN — {supplier.name}",
            created_by="seed",
        )

        for pid, qty, cost in zip(event["product_ids"], event["qtys"], event["costs"]):
            GoodsReceiptItem.objects.create(
                goods_receipt=grn,
                product_id=pid,
                quantity=qty,
                cost_price=cost,
            )
            Stock.objects.filter(product_id=pid, warehouse=wh).update(
                quantity=F("quantity") + qty
            )
            StockMovement.objects.create(
                product_id=pid,
                to_warehouse=wh,
                quantity=qty,
                type=StockMovement.RECEIPT,
                reference_type="goods_receipt",
                reference_id=str(grn.pk),
                notes=f"GRN #{grn.pk}: {qty} units @ {cost}",
                created_by="seed",
            )

        items_desc = ", ".join(
            f"#{pid} x{qty}" for pid, qty in zip(event["product_ids"], event["qtys"])
        )
        self._create_activity_event(
            event_type="create",
            message=f"Створено накладну #{grn.pk}: {supplier.name}, "
                    f"{len(event['product_ids'])} товарів ({items_desc}) на складі {wh.name}",
            entity_type="goods_receipt",
            entity_id=grn.pk,
            created_at=event_dt,
        )

    def _process_transfer(self, event):
        from_wh = event["from_warehouse"]
        to_wh = event["to_warehouse"]
        pid = event["product_id"]
        qty = event["qty"]
        event_dt = self._event_datetime(event["days_ago"])

        try:
            stock_from = Stock.objects.get(product_id=pid, warehouse=from_wh)
        except Stock.DoesNotExist:
            return

        if stock_from.quantity < qty:
            return

        with transaction.atomic():
            Stock.objects.filter(product_id=pid, warehouse=from_wh).update(
                quantity=F("quantity") - qty
            )
            Stock.objects.get_or_create(
                product_id=pid,
                warehouse=to_wh,
                defaults={"quantity": 0, "reserved": 0},
            )
            Stock.objects.filter(product_id=pid, warehouse=to_wh).update(
                quantity=F("quantity") + qty
            )

            movement = StockMovement.objects.create(
                product_id=pid,
                from_warehouse=from_wh,
                to_warehouse=to_wh,
                quantity=qty,
                type=StockMovement.TRANSFER,
                reference_type="transfer",
                reference_id="",
                idempotency_key=(
                    f"transfer-seed-{event['days_ago']}-{pid}-"
                    f"{from_wh.id}-{to_wh.id}"
                ),
                notes=f"Переміщення {qty} од. товару #{pid} з {from_wh.name} на {to_wh.name}",
                created_by="seed",
            )

        self._create_activity_event(
            event_type="info",
            message=f"Переміщено товар #{pid} x{qty} з «{from_wh.name}» на «{to_wh.name}»",
            entity_type="stock_movement",
            entity_id=movement.pk,
            created_at=event_dt,
        )

    def _process_writeoff(self, event):
        wh = event["warehouse"]
        pid = event["product_id"]
        qty = event["qty"]
        reason = event["reason"]
        event_dt = self._event_datetime(event["days_ago"])

        try:
            stock = Stock.objects.get(product_id=pid, warehouse=wh)
        except Stock.DoesNotExist:
            return False

        if stock.quantity < qty:
            return False

        Stock.objects.filter(product_id=pid, warehouse=wh).update(
            quantity=F("quantity") - qty
        )

        movement = StockMovement.objects.create(
            product_id=pid,
            from_warehouse=wh,
            quantity=qty,
            type=StockMovement.WRITE_OFF,
            reference_type="write_off",
            reference_id="",
            idempotency_key=f"writeoff-seed-{event['days_ago']}-{pid}",
            notes=f"Списання: {reason}",
            created_by="seed",
        )

        self._create_activity_event(
            event_type="delete",
            message=f"Списано товар #{pid} x{qty} на «{wh.name}»: {reason}",
            entity_type="stock_movement",
            entity_id=movement.pk,
            created_at=event_dt,
        )
        return True

    def _process_sale(self, event):
        wh = event["warehouse"]
        pid = event["product_id"]
        qty = event["qty"]
        event_dt = self._event_datetime(event["days_ago"])

        try:
            stock = Stock.objects.get(product_id=pid, warehouse=wh)
        except Stock.DoesNotExist:
            return False

        if stock.quantity < qty:
            return False

        Stock.objects.filter(product_id=pid, warehouse=wh).update(
            quantity=F("quantity") - qty
        )

        movement = StockMovement.objects.create(
            product_id=pid,
            from_warehouse=wh,
            quantity=qty,
            type=StockMovement.SALE,
            reference_type="sale",
            reference_id="",
            notes=f"Продаж {qty} од. товару #{pid}",
            created_by="seed",
        )

        self._create_activity_event(
            event_type="info",
            message=f"Продано товар #{pid} x{qty} з «{wh.name}»",
            entity_type="stock_movement",
            entity_id=movement.pk,
            created_at=event_dt,
        )
        return True
