from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Category, Product


class Command(BaseCommand):
    help = "Seed database with household appliances data"

    def handle(self, *args, **options):
        self._create_categories()
        self._create_products()
        self.stdout.write(self.style.SUCCESS("Seed data created successfully"))

    def _create_categories(self):
        categories = [
            "Холодильники",
            "Пральні машини",
            "Духовки",
            "Мікрохвильовки",
            "Пилососи",
            "Кавоварки",
            "Дрібна техніка",
        ]
        for name in categories:
            cat, created = Category.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f"  Created category: {cat.name}")

    def _create_products(self):
        products_data = [
            {"name": "Холодильник Samsung RB38T602DSA", "category": "Холодильники", "price": 29999, "original_price": 34999, "stock": 15, "rating": 4.7, "features": ["No Frost", "Digital Inverter"], "specs": {"Енергоклас": "A++", "Об'єм": "385 л", "Висота": "185 см", "Колір": "Сріблястий"}},
            {"name": "Холодильник LG GW-B509SMQZ", "category": "Холодильники", "price": 25999, "original_price": 29999, "stock": 12, "rating": 4.5, "features": ["DoorCooling+", "Linear Cooling"], "specs": {"Енергоклас": "A+", "Об'єм": "350 л", "Висота": "178 см", "Колір": "Білий"}},
            {"name": "Холодильник Whirlpool WRT311FZDW", "category": "Холодильники", "price": 15999, "original_price": 18999, "stock": 20, "rating": 4.3, "features": ["Accu-Chill", "Humidity Control"], "specs": {"Енергоклас": "A+", "Об'єм": "275 л", "Висота": "165 см", "Колір": "Білий"}},
            {"name": "Холодильник Bosch KGN36XI40", "category": "Холодильники", "price": 34999, "original_price": 39999, "stock": 8, "rating": 4.8, "features": ["VitaFresh", "NoFrost"], "specs": {"Енергоклас": "A++", "Об'єм": "420 л", "Висота": "192 см", "Колір": "Нержавійка"}},
            {"name": "Холодильник Liebherr CNPes 4356", "category": "Холодильники", "price": 45999, "original_price": 51999, "stock": 4, "rating": 4.9, "features": ["BioFresh", "NoFrost", "IceMaker"], "specs": {"Енергоклас": "A++", "Об'єм": "456 л", "Висота": "195 см", "Колір": "Нержавійка"}},
            {"name": "Пральна машина LG F2V5HS0W", "category": "Пральні машини", "price": 19999, "original_price": 23999, "stock": 18, "rating": 4.6, "features": ["AI DD", "Steam", "TurboWash"], "specs": {"Завантаження": "7 кг", "Оберти": "1200", "Енергоклас": "A+++", "Рівень шуму": "54 dB"}},
            {"name": "Пральна машина Samsung WW70T4040CE", "category": "Пральні машини", "price": 17999, "original_price": 20999, "stock": 22, "rating": 4.4, "features": ["EcoBubble", "AddWash", "Digital Inverter"], "specs": {"Завантаження": "7 кг", "Оберти": "1400", "Енергоклас": "A+++", "Рівень шуму": "52 dB"}},
            {"name": "Пральна машина Bosch WAN28280UA", "category": "Пральні машини", "price": 26999, "original_price": 30999, "stock": 10, "rating": 4.7, "features": ["ActiveWater", "VarioPerfect"], "specs": {"Завантаження": "8 кг", "Оберти": "1200", "Енергоклас": "A+++", "Рівень шуму": "51 dB"}},
            {"name": "Пральна машина Whirlpool FSCR10420", "category": "Пральні машини", "price": 21999, "original_price": 25999, "stock": 14, "rating": 4.5, "features": ["6th Sense", "Fresh Care"], "specs": {"Завантаження": "10 кг", "Оберти": "1400", "Енергоклас": "A+++", "Рівень шуму": "56 dB"}},
            {"name": "Пральна машина Electrolux EW7W3685W", "category": "Пральні машини", "price": 32999, "original_price": 37999, "stock": 6, "rating": 4.7, "features": ["UltraMix", "SteamCare"], "specs": {"Завантаження": "8 кг", "Оберти": "1600", "Енергоклас": "A+++", "Рівень шуму": "51 dB"}},
            {"name": "Духовка електрична Bosch HBG7320B1", "category": "Духовки", "price": 24999, "original_price": 28999, "stock": 9, "rating": 4.6, "features": ["PerfectBake", "4D Hotair", "Pyrolytic Clean"], "specs": {"Тип": "Електрична", "Об'єм": "71 л", "Енергоклас": "A+", "Колір": "Чорний"}},
            {"name": "Духовка Samsung NV70H7740CS", "category": "Духовки", "price": 31999, "original_price": 36999, "stock": 5, "rating": 4.8, "features": ["Smart Oven", "Chef Mode"], "specs": {"Тип": "Електрична", "Об'єм": "76 л", "Енергоклас": "A++", "Колір": "Нержавійка"}},
            {"name": "Мікрохвильова піч Samsung MG23K3575AS", "category": "Мікрохвильовки", "price": 7999, "original_price": 9499, "stock": 16, "rating": 4.4, "features": ["Grill", "Ceramic Interior"], "specs": {"Місткість": "23 л", "Потужність": "800 Вт", "Тип": "Соло+Гриль", "Колір": "Сріблястий"}},
            {"name": "Мікрохвильова піч LG MS2336GIB", "category": "Мікрохвильовки", "price": 6499, "original_price": 7499, "stock": 14, "rating": 4.3, "features": ["EasyClean", "Smart Inverter"], "specs": {"Місткість": "23 л", "Потужність": "1000 Вт", "Тип": "Соло", "Колір": "Чорний"}},
            {"name": "Пилосос Dyson V15 Detect", "category": "Пилососи", "price": 28999, "original_price": 32999, "stock": 11, "rating": 4.7, "features": ["Laser Slim", "Piezo Sensor"], "specs": {"Тип": "Бездротовий", "Потужність": "660 Вт", "Час роботи": "60 хв"}},
            {"name": "Пилосос Xiaomi Robot Vacuum S20", "category": "Пилососи", "price": 14999, "original_price": 17999, "stock": 25, "rating": 4.5, "features": ["LDS Navigation", "5000Pa"], "specs": {"Тип": "Робот-пилосос", "Час роботи": "120 хв", "Місткість": "450 мл"}},
            {"name": "Пилосос Miele Complete C3", "category": "Пилососи", "price": 15999, "original_price": 18999, "stock": 7, "rating": 4.8, "features": ["AirClean", "Silent"], "specs": {"Тип": "З мішком", "Потужність": "890 Вт", "Радіус дії": "12 м"}},
            {"name": "Пилосос Karcher WD 3", "category": "Пилососи", "price": 6999, "original_price": 8499, "stock": 18, "rating": 4.6, "features": ["Wet&Dry", "Blower Function"], "specs": {"Тип": "Вологий+сухий", "Потужність": "1000 Вт", "Місткість": "17 л"}},
            {"name": "Кавоварка DeLonghi Magnifica S", "category": "Кавоварки", "price": 26999, "original_price": 30999, "stock": 6, "rating": 4.6, "features": ["Cappuccino System", "Bean to Cup"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.8 л"}},
            {"name": "Кавоварка Philips EP2220/10", "category": "Кавоварки", "price": 19999, "original_price": 23999, "stock": 8, "rating": 4.4, "features": ["LatteGo", "AquaClean"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.8 л"}},
            {"name": "Кавоварка Nespresso Essenza Mini", "category": "Кавоварки", "price": 4999, "original_price": 5999, "stock": 20, "rating": 4.4, "features": ["19 Bar", "Fast Heat Up"], "specs": {"Тип": "Капсульна", "Тиск": "19 бар"}},
            {"name": "Кавоварка Rancilio Silvia", "category": "Кавоварки", "price": 39999, "original_price": 44999, "stock": 3, "rating": 4.9, "features": ["Commercial Grade", "PID Control"], "specs": {"Тип": "Ручна", "Тиск": "15 бар", "Матеріал": "Нержавійка"}},
            {"name": "Мультиварка Xiaomi Mi Smart", "category": "Дрібна техніка", "price": 4999, "original_price": 5999, "stock": 30, "rating": 4.3, "features": ["WiFi Control", "24 Recipes"], "specs": {"Місткість": "5 л", "Потужність": "900 Вт"}},
            {"name": "Блендер Bosch MMBH6P6B", "category": "Дрібна техніка", "price": 5999, "original_price": 6999, "stock": 20, "rating": 4.5, "features": ["6 Blades", "1.5 L", "Pulse Function"], "specs": {"Потужність": "1000 Вт", "Місткість": "1.5 л"}},
            {"name": "Праска Philips GC5035/80", "category": "Дрібна техніка", "price": 3999, "original_price": 4999, "stock": 15, "rating": 4.4, "features": ["SteamGlide", "OptimalTemp"], "specs": {"Потужність": "2400 Вт", "Місткість": "300 мл", "Тип": "Бездротова"}},
            {"name": "Фен Dyson Supersonic HD08", "category": "Дрібна техніка", "price": 17999, "original_price": 19999, "stock": 5, "rating": 4.8, "features": ["Air Multiplier", "Intelligent Heat"], "specs": {"Потужність": "1600 Вт", "Швидкостей": "3", "Насадки": "5"}},
        ]

        cat_map = {c.name: c for c in Category.objects.all()}

        for p_data in products_data:
            cat_name = p_data.pop("category")
            category = cat_map.get(cat_name)
            if not category:
                continue

            product, created = Product.objects.get_or_create(
                name=p_data["name"],
                defaults={
                    "category": category,
                    "description": f"{p_data['name']} — надійна побутова техніка. Висока якість, енергоефективність та сучасний дизайн.",
                    "price": Decimal(str(p_data["price"])),
                    "original_price": Decimal(str(p_data["original_price"])),
                    "stock": p_data["stock"],
                    "rating": Decimal(str(p_data["rating"])),
                    "features": p_data.get("features", []),
                    "specs": p_data.get("specs", {}),
                },
            )
            if created:
                self.stdout.write(f"  Created product: {product.name}")
