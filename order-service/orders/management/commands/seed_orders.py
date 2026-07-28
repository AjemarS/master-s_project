from datetime import datetime, timedelta
from decimal import Decimal
from random import choice, choices, randint, random, sample
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

REPEAT_EMAILS = {"olena@example.com", "andriy@example.com", "max@example.com"}

CITIES = ["Київ", "Харків", "Львів", "Одеса", "Дніпро", "Запоріжжя"]

STREETS = [
    "вул. Хрещатик",
    "вул. Володимирська",
    "вул. Велика Васильківська",
    "вул. Саксаганського",
    "вул. Антоновича",
    "вул. Сумська",
    "вул. Пушкінська",
    "просп. Науки",
    "просп. Перемоги",
    "просп. Свободи",
    "вул. Гетьмана Мазепи",
    "вул. Шевченка",
    "вул. Франка",
    "вул. Грушевського",
    "вул. Лесі Українки",
    "вул. Сковороди",
    "вул. Незалежності",
    "вул. Миру",
    "бульв. Тараса Шевченка",
    "вул. Зелена",
]

# Repeat customer weight: 14, regular: 9 => 3*14/(3*14+7*9) = 42/105 = 40% repeat probability
CUSTOMER_WEIGHTS = [14 if c["email"] in REPEAT_EMAILS else 9 for c in CUSTOMERS]


def _day_order_count(weekday: int) -> int:
    """0=Monday..6=Sunday. Slower Mon-Tue, normal Wed-Thu, busy Fri-Sun."""
    if weekday <= 1:
        return randint(0, 2)
    if weekday <= 3:
        return randint(1, 3)
    return randint(1, 4)


def _pick_hour() -> int:
    """40% lunch 10-14, 30% evening 17-20, 30% scattered 8-22."""
    block = choices(["lunch", "evening", "scattered"], weights=[40, 30, 30], k=1)[0]
    if block == "lunch":
        return randint(10, 13)
    if block == "evening":
        return randint(17, 19)
    return choice([8, 9, 14, 15, 16, 20, 21])


def _order_status(hours_ago: float) -> str:
    """Status reflects time elapsed. 8% random cancellations."""
    if random() < 0.08:
        return "cancelled"
    if hours_ago < 1:
        return choice(["unpaid", "paid"])
    if hours_ago < 24:
        return choice(["paid", "delivering"])
    if hours_ago < 72:
        return choice(["delivering", "delivered"])
    return choice(["delivered", "completed"])


def _payment_status(order_status: str) -> str:
    if order_status == "unpaid":
        return "unpaid"
    if order_status == "cancelled":
        # 37.5% of cancelled = unpaid -> ~3% of all orders
        return "unpaid" if random() < 0.375 else "refunded"
    return "paid"


def _pick_customer() -> dict:
    """Weighted: 3 repeat buyers get 40% combined probability."""
    return choices(CUSTOMERS, weights=CUSTOMER_WEIGHTS, k=1)[0]


class Command(BaseCommand):
    help = "Seed database with realistic order data over 60 days"

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing orders...")
        OrderItem.objects.all().delete()
        Order.objects.all().delete()

        self.stdout.write("Seeding orders...")
        now = timezone.now()
        count = 0

        for days_ago in range(60):
            day = (now - timedelta(days=days_ago)).date()
            weekday = day.weekday()
            orders_today = _day_order_count(weekday)

            for _ in range(orders_today):
                self._create_order(weekday, day, now)
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {count} orders"))

    def _create_order(self, weekday: int, day, now):
        customer = _pick_customer()

        channel = choices(["online", "offline"], weights=[65, 35], k=1)[0]
        is_weekend = weekday >= 4  # Fri-Sun

        # --- Timestamp with time-of-day clustering ---
        hour = _pick_hour()
        minute = randint(0, 59)
        base_time = timezone.make_aware(
            datetime(day.year, day.month, day.day, hour, minute),
            timezone.get_current_timezone(),
        )
        if base_time > now:
            base_time = now - timedelta(minutes=randint(5, 60))

        hours_ago = (now - base_time).total_seconds() / 3600
        status = _order_status(hours_ago)
        payment_status = _payment_status(status)

        # --- Order number ---
        order_number = f"ORD-{base_time.strftime('%Y%m%d')}-{randint(100, 999)}"

        # --- Items ---
        items_count = randint(2, 4) if is_weekend else randint(1, 3)

        if is_weekend:
            # Price-weighted selection -> slight bias toward expensive items
            selected = []
            pool = list(range(len(PRODUCTS)))
            for _ in range(items_count):
                if not pool:
                    break
                idx = choices(pool, weights=[PRODUCTS[i]["price"] for i in pool], k=1)[0]
                pool.remove(idx)
                selected.append(PRODUCTS[idx])
        else:
            selected = sample(PRODUCTS, min(items_count, len(PRODUCTS)))

        # --- Warehouse, delivery, and created_by ---
        if channel == "online":
            warehouse_id: int = choice([1, 1, 1, 3, 4])  # bias toward central
            city = choice(CITIES)
            street = f"{choice(STREETS)}, {randint(1, 120)}"

            if warehouse_id == 1:
                delivery_method = choice(["pickup", "nova_poshta", "courier"])
            elif warehouse_id in (3, 4):
                delivery_method = "nova_poshta"
            else:
                delivery_method = "pickup"

            shipping_city = city if delivery_method != "pickup" else ""
            shipping_address = street if delivery_method != "pickup" else ""
            created_by = choice(["admin@techhub.local", "customer@techhub.local"])
        else:
            warehouse_id = choice([2, 5])  # Шоурум Київ or Одеса
            delivery_method = "pickup"
            shipping_city = ""
            shipping_address = ""
            created_by = "cashier@techhub.local"

        # --- Build order items and total ---
        items_data = []
        total = Decimal("0")
        for p in selected:
            qty = randint(1, 2)
            items_data.append((p, qty))
            total += Decimal(str(p["price"])) * qty

        # --- Create order ---
        order = Order.objects.create(
            order_number=order_number,
            channel=channel,
            status=status,
            warehouse_id=warehouse_id,
            delivery_method=delivery_method,
            shipping_city=shipping_city,
            shipping_address=shipping_address,
            customer_name=customer["name"],
            customer_phone=customer["phone"],
            customer_email=customer["email"],
            total_amount=total,
            payment_status=payment_status,
            created_by=created_by,
        )

        # --- Backdate timestamps ---
        updated_at = min(base_time + timedelta(hours=randint(1, 24)), now)
        Order.objects.filter(pk=order.pk).update(
            created_at=base_time,
            updated_at=updated_at,
        )

        # --- Create order items ---
        for p, qty in items_data:
            OrderItem.objects.create(
                order=order,
                product_id=p["id"],
                product_name=p["name"],
                quantity=qty,
                price=Decimal(str(p["price"])),
                cost_price=Decimal(str(p["cost"])),
            )
