from datetime import timedelta
from decimal import Decimal
from random import choice, randint, sample, uniform
from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order, OrderItem

PRODUCTS = [
    {"id": 1, "name": "Холодильник Samsung RB38T602DSA", "price": 29999, "cost": 21000},
    {"id": 2, "name": "Холодильник LG GW-B509SMQZ", "price": 25999, "cost": 18500},
    {"id": 3, "name": "Холодильник Whirlpool WRT311FZDW", "price": 15999, "cost": 11500},
    {"id": 4, "name": "Холодильник Bosch KGN36XI40", "price": 34999, "cost": 25000},
    {"id": 5, "name": "Холодильник Liebherr CNPes 4356", "price": 45999, "cost": 33000},
    {"id": 6, "name": "Пральна машина LG F2V5HS0W", "price": 19999, "cost": 14000},
    {"id": 7, "name": "Пральна машина Samsung WW70T4040CE", "price": 17999, "cost": 12500},
    {"id": 8, "name": "Пральна машина Bosch WAN28280UA", "price": 26999, "cost": 19500},
    {"id": 9, "name": "Пральна машина Whirlpool FSCR10420", "price": 21999, "cost": 15500},
    {"id": 10, "name": "Пральна машина Electrolux EW7W3685W", "price": 32999, "cost": 24000},
    {"id": 11, "name": "Духовка електрична Bosch HBG7320B1", "price": 24999, "cost": 18000},
    {"id": 12, "name": "Духовка Samsung NV70H7740CS", "price": 31999, "cost": 23000},
    {"id": 13, "name": "Мікрохвильова піч Samsung MG23K3575AS", "price": 7999, "cost": 5500},
    {"id": 14, "name": "Мікрохвильова піч LG MS2336GIB", "price": 6499, "cost": 4500},
    {"id": 15, "name": "Пилосос Dyson V15 Detect", "price": 28999, "cost": 21000},
    {"id": 16, "name": "Пилосос Xiaomi Robot Vacuum S20", "price": 14999, "cost": 10500},
    {"id": 17, "name": "Пилосос Miele Complete C3", "price": 15999, "cost": 11500},
    {"id": 18, "name": "Пилосос Karcher WD 3", "price": 6999, "cost": 4800},
    {"id": 19, "name": "Кавоварка Philips EP2235/40", "price": 21999, "cost": 16000},
    {"id": 20, "name": "Кавоварка De'Longhi Magnifica S", "price": 27999, "cost": 20000},
    {"id": 21, "name": "Кавоварка Nescafe Dolce Gusto", "price": 4999, "cost": 3200},
    {"id": 22, "name": "Мультиварка Xiaomi Mijia", "price": 3999, "cost": 2500},
    {"id": 23, "name": "Електрочайник Bosch TWK7201", "price": 2499, "cost": 1500},
    {"id": 24, "name": "М'ясорубка Zelmer 687.5", "price": 4499, "cost": 3000},
    {"id": 25, "name": "Блендер Philips HR3655/90", "price": 5999, "cost": 4000},
]

CUSTOMERS = [
    {"name": "Олена Коваленко", "phone": "+380501234567", "email": "olena@example.com"},
    {"name": "Андрій Мельник", "phone": "+380671234568", "email": "andriy@example.com"},
    {"name": "Ірина Шевченко", "phone": "+380931234569", "email": "iryna@example.com"},
    {"name": "Максим Бондаренко", "phone": "+380631234570", "email": "max@example.com"},
    {"name": "Наталія Лисенко", "phone": "+380951234571", "email": "natali@example.com"},
    {"name": "Тарас Грищенко", "phone": "+380731234572", "email": "taras@example.com"},
    {"name": "Олександр Ковальчук", "phone": "+380661234573", "email": "olex@example.com"},
    {"name": "Юлія Ткаченко", "phone": "+380501234574", "email": "yulia@example.com"},
    {"name": "Дмитро Кравець", "phone": "+380671234575", "email": "dmytro@example.com"},
    {"name": "Світлана Савченко", "phone": "+380931234576", "email": "svitlana@example.com"},
]

STATUSES = ["unpaid", "paid", "delivering", "delivered", "completed", "cancelled"]
CHANNELS = ["online", "offline"]


class Command(BaseCommand):
    help = "Seed database with realistic order data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding orders...")
        count = 0
        for days_ago in range(30):
            orders_today = randint(0, 3)
            for _ in range(orders_today):
                self._create_order(days_ago)
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Created {count} orders"))

    def _create_order(self, days_ago):
        customer = choice(CUSTOMERS)
        channel = choice(CHANNELS)
        status = choice(STATUSES)
        payment_status = "paid" if status in ("paid", "delivering", "delivered", "completed") else "unpaid" if status == "unpaid" else "refunded"

        base_time = timezone.now() - timedelta(days=days_ago, hours=randint(8, 20), minutes=randint(0, 59))

        order_number = f"ORD-{base_time.strftime('%Y%m%d')}-{randint(100, 999)}"

        items_count = randint(1, 4)
        selected = sample(PRODUCTS, min(items_count, len(PRODUCTS)))
        total = sum(p["price"] for p in selected)

        order = Order.objects.create(
            order_number=order_number,
            channel=channel,
            status=status,
            warehouse_id=randint(1, 2),
            customer_name=customer["name"],
            customer_phone=customer["phone"],
            customer_email=customer["email"],
            total_amount=Decimal(str(total)),
            payment_status=payment_status,
            created_by=choice(["admin@techhub.local", "cashier@techhub.local"]),
        )

        Order.objects.filter(pk=order.pk).update(created_at=base_time, updated_at=base_time + timedelta(hours=randint(1, 24)))

        for p in selected:
            OrderItem.objects.create(
                order=order,
                product_id=p["id"],
                product_name=p["name"],
                quantity=randint(1, 2),
                price=Decimal(str(p["price"])),
                cost_price=Decimal(str(p["cost"])),
            )
