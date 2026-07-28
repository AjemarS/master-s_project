import io
import textwrap
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw, ImageFont

from products.models import Category, Product

from django.utils import timezone
from datetime import timedelta
import random


class Command(BaseCommand):
    help = "Seed database with household appliances data"

    def handle(self, *args, **options):
        self._create_categories()
        self._create_products()
        self.stdout.write(self.style.SUCCESS("Seed data created successfully"))

    def _create_categories(self):
        cat_palette = {
            "Холодильники": ("#e3f2fd", "#1565c0"),
            "Пральні машини": ("#e8f5e9", "#2e7d32"),
            "Духовки": ("#fff3e0", "#e65100"),
            "Мікрохвильовки": ("#f3e5f5", "#6a1b9a"),
            "Пилососи": ("#e0f7fa", "#00695c"),
            "Кавоварки": ("#fce4ec", "#c62828"),
            "Дрібна техніка": ("#fff8e1", "#f57f17"),
            "Кліматична техніка": ("#e0f2fe", "#0369a1"),
        }
        for name, name_en in [
            ("Холодильники", "Refrigerators"),
            ("Пральні машини", "Washing Machines"),
            ("Духовки", "Ovens"),
            ("Мікрохвильовки", "Microwaves"),
            ("Пилососи", "Vacuum Cleaners"),
            ("Кавоварки", "Coffee Machines"),
            ("Дрібна техніка", "Small Appliances"),
            ("Кліматична техніка", "Climate Control"),
        ]:
            cat, created = Category.objects.get_or_create(
                name=name,
                defaults={"name_en": name_en},
            )
            if not created:
                cat.name_en = name_en
                cat.save(update_fields=["name_en"])
            self._set_category_placeholder(cat, name_en)
            if created:
                self.stdout.write(f"  Created category: {cat.name}")

    def _create_products(self):
        products_data = [
            {"name": "Холодильник Samsung RB38T602DSA", "name_en": "Samsung RB38T602DSA Refrigerator", "category": "Холодильники", "brand": "Samsung", "color": "Silver", "price": 29999, "original_price": 34999, "stock": 15, "rating": 4.7, "features": ["No Frost", "Digital Inverter"], "specs": {"Енергоклас": "A++", "Об'єм": "385 л", "Висота": "185 см", "Колір": "Сріблястий"}},
            {"name": "Холодильник LG GW-B509SMQZ", "name_en": "LG GW-B509SMQZ Refrigerator", "category": "Холодильники", "brand": "LG", "color": "White", "price": 25999, "original_price": 29999, "stock": 12, "rating": 4.5, "features": ["DoorCooling+", "Linear Cooling"], "specs": {"Енергоклас": "A+", "Об'єм": "350 л", "Висота": "178 см", "Колір": "Білий"}},
            {"name": "Холодильник Whirlpool WRT311FZDW", "name_en": "Whirlpool WRT311FZDW Refrigerator", "category": "Холодильники", "brand": "Whirlpool", "color": "White", "price": 15999, "original_price": 18999, "stock": 20, "rating": 4.3, "features": ["Accu-Chill", "Humidity Control"], "specs": {"Енергоклас": "A+", "Об'єм": "275 л", "Висота": "165 см", "Колір": "Білий"}},
            {"name": "Холодильник Bosch KGN36XI40", "name_en": "Bosch KGN36XI40 Refrigerator", "category": "Холодильники", "brand": "Bosch", "color": "Stainless", "price": 34999, "original_price": 39999, "stock": 8, "rating": 4.8, "features": ["VitaFresh", "NoFrost"], "specs": {"Енергоклас": "A++", "Об'єм": "420 л", "Висота": "192 см", "Колір": "Нержавійка"}},
            {"name": "Холодильник Liebherr CNPes 4356", "name_en": "Liebherr CNPes 4356 Refrigerator", "category": "Холодильники", "brand": "Liebherr", "color": "Stainless", "price": 45999, "original_price": 51999, "stock": 4, "rating": 4.9, "features": ["BioFresh", "NoFrost", "IceMaker"], "specs": {"Енергоклас": "A++", "Об'єм": "456 л", "Висота": "195 см", "Колір": "Нержавійка"}},
            {"name": "Пральна машина LG F2V5HS0W", "name_en": "LG F2V5HS0W Washing Machine", "category": "Пральні машини", "brand": "LG", "color": "", "price": 19999, "original_price": 23999, "stock": 18, "rating": 4.6, "features": ["AI DD", "Steam", "TurboWash"], "specs": {"Завантаження": "7 кг", "Оберти": "1200", "Енергоклас": "A+++", "Рівень шуму": "54 dB"}},
            {"name": "Пральна машина Samsung WW70T4040CE", "name_en": "Samsung WW70T4040CE Washing Machine", "category": "Пральні машини", "brand": "Samsung", "color": "", "price": 17999, "original_price": 20999, "stock": 22, "rating": 4.4, "features": ["EcoBubble", "AddWash", "Digital Inverter"], "specs": {"Завантаження": "7 кг", "Оберти": "1400", "Енергоклас": "A+++", "Рівень шуму": "52 dB"}},
            {"name": "Пральна машина Bosch WAN28280UA", "name_en": "Bosch WAN28280UA Washing Machine", "category": "Пральні машини", "brand": "Bosch", "color": "", "price": 26999, "original_price": 30999, "stock": 10, "rating": 4.7, "features": ["ActiveWater", "VarioPerfect"], "specs": {"Завантаження": "8 кг", "Оберти": "1200", "Енергоклас": "A+++", "Рівень шуму": "51 dB"}},
            {"name": "Пральна машина Whirlpool FSCR10420", "name_en": "Whirlpool FSCR10420 Washing Machine", "category": "Пральні машини", "brand": "Whirlpool", "color": "", "price": 21999, "original_price": 25999, "stock": 14, "rating": 4.5, "features": ["6th Sense", "Fresh Care"], "specs": {"Завантаження": "10 кг", "Оберти": "1400", "Енергоклас": "A+++", "Рівень шуму": "56 dB"}},
            {"name": "Пральна машина Electrolux EW7W3685W", "name_en": "Electrolux EW7W3685W Washing Machine", "category": "Пральні машини", "brand": "Electrolux", "color": "", "price": 32999, "original_price": 37999, "stock": 6, "rating": 4.7, "features": ["UltraMix", "SteamCare"], "specs": {"Завантаження": "8 кг", "Оберти": "1600", "Енергоклас": "A+++", "Рівень шуму": "51 dB"}},
            {"name": "Духовка електрична Bosch HBG7320B1", "name_en": "Bosch HBG7320B1 Electric Oven", "category": "Духовки", "brand": "Bosch", "color": "Black", "price": 24999, "original_price": 28999, "stock": 9, "rating": 4.6, "features": ["PerfectBake", "4D Hotair", "Pyrolytic Clean"], "specs": {"Тип": "Електрична", "Об'єм": "71 л", "Енергоклас": "A+", "Колір": "Чорний"}},
            {"name": "Духовка Samsung NV70H7740CS", "name_en": "Samsung NV70H7740CS Oven", "category": "Духовки", "brand": "Samsung", "color": "Stainless", "price": 31999, "original_price": 36999, "stock": 5, "rating": 4.8, "features": ["Smart Oven", "Chef Mode"], "specs": {"Тип": "Електрична", "Об'єм": "76 л", "Енергоклас": "A++", "Колір": "Нержавійка"}},
            {"name": "Мікрохвильова піч Samsung MG23K3575AS", "name_en": "Samsung MG23K3575AS Microwave", "category": "Мікрохвильовки", "brand": "Samsung", "color": "Silver", "price": 7999, "original_price": 9499, "stock": 16, "rating": 4.4, "features": ["Grill", "Ceramic Interior"], "specs": {"Місткість": "23 л", "Потужність": "800 Вт", "Тип": "Соло+Гриль", "Колір": "Сріблястий"}},
            {"name": "Мікрохвильова піч LG MS2336GIB", "name_en": "LG MS2336GIB Microwave", "category": "Мікрохвильовки", "brand": "LG", "color": "Black", "price": 6499, "original_price": 7499, "stock": 14, "rating": 4.3, "features": ["EasyClean", "Smart Inverter"], "specs": {"Місткість": "23 л", "Потужність": "1000 Вт", "Тип": "Соло", "Колір": "Чорний"}},
            {"name": "Пилосос Dyson V15 Detect", "name_en": "Dyson V15 Detect Vacuum", "category": "Пилососи", "brand": "Dyson", "color": "", "price": 28999, "original_price": 32999, "stock": 11, "rating": 4.7, "features": ["Laser Slim", "Piezo Sensor"], "specs": {"Тип": "Бездротовий", "Потужність": "660 Вт", "Час роботи": "60 хв"}},
            {"name": "Пилосос Xiaomi Robot Vacuum S20", "name_en": "Xiaomi Robot Vacuum S20", "category": "Пилососи", "brand": "Xiaomi", "color": "", "price": 14999, "original_price": 17999, "stock": 25, "rating": 4.5, "features": ["LDS Navigation", "5000Pa"], "specs": {"Тип": "Робот-пилосос", "Час роботи": "120 хв", "Місткість": "450 мл"}},
            {"name": "Пилосос Miele Complete C3", "name_en": "Miele Complete C3 Vacuum", "category": "Пилососи", "brand": "Miele", "color": "", "price": 15999, "original_price": 18999, "stock": 7, "rating": 4.8, "features": ["AirClean", "Silent"], "specs": {"Тип": "З мішком", "Потужність": "890 Вт", "Радіус дії": "12 м"}},
            {"name": "Пилосос Karcher WD 3", "name_en": "Karcher WD 3 Vacuum", "category": "Пилососи", "brand": "Karcher", "color": "", "price": 6999, "original_price": 8499, "stock": 18, "rating": 4.6, "features": ["Wet&Dry", "Blower Function"], "specs": {"Тип": "Вологий+сухий", "Потужність": "1000 Вт", "Місткість": "17 л"}},
            {"name": "Кавоварка DeLonghi Magnifica S", "name_en": "DeLonghi Magnifica S Coffee Machine", "category": "Кавоварки", "brand": "DeLonghi", "color": "", "price": 26999, "original_price": 30999, "stock": 6, "rating": 4.6, "features": ["Cappuccino System", "Bean to Cup"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.8 л"}},
            {"name": "Кавоварка Philips EP2220/10", "name_en": "Philips EP2220/10 Coffee Machine", "category": "Кавоварки", "brand": "Philips", "color": "", "price": 19999, "original_price": 23999, "stock": 8, "rating": 4.4, "features": ["LatteGo", "AquaClean"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.8 л"}},
            {"name": "Кавоварка Nespresso Essenza Mini", "name_en": "Nespresso Essenza Mini Coffee Machine", "category": "Кавоварки", "brand": "Nespresso", "color": "", "price": 4999, "original_price": 5999, "stock": 20, "rating": 4.4, "features": ["19 Bar", "Fast Heat Up"], "specs": {"Тип": "Капсульна", "Тиск": "19 бар"}},
            {"name": "Кавоварка Rancilio Silvia", "name_en": "Rancilio Silvia Coffee Machine", "category": "Кавоварки", "brand": "Rancilio", "color": "", "price": 39999, "original_price": 44999, "stock": 3, "rating": 4.9, "features": ["Commercial Grade", "PID Control"], "specs": {"Тип": "Ручна", "Тиск": "15 бар", "Матеріал": "Нержавійка"}},
            {"name": "Мультиварка Xiaomi Mi Smart", "name_en": "Xiaomi Mi Smart Multicooker", "category": "Дрібна техніка", "brand": "Xiaomi", "color": "", "price": 4999, "original_price": 5999, "stock": 30, "rating": 4.3, "features": ["WiFi Control", "24 Recipes"], "specs": {"Місткість": "5 л", "Потужність": "900 Вт"}},
            {"name": "Блендер Bosch MMBH6P6B", "name_en": "Bosch MMBH6P6B Blender", "category": "Дрібна техніка", "brand": "Bosch", "color": "", "price": 5999, "original_price": 6999, "stock": 20, "rating": 4.5, "features": ["6 Blades", "1.5 L", "Pulse Function"], "specs": {"Потужність": "1000 Вт", "Місткість": "1.5 л"}},
            {"name": "Праска Philips GC5035/80", "name_en": "Philips GC5035/80 Iron", "category": "Дрібна техніка", "brand": "Philips", "color": "", "price": 3999, "original_price": 4999, "stock": 15, "rating": 4.4, "features": ["SteamGlide", "OptimalTemp"], "specs": {"Потужність": "2400 Вт", "Місткість": "300 мл", "Тип": "Бездротова"}},
            {"name": "Фен Dyson Supersonic HD08", "name_en": "Dyson Supersonic HD08 Hair Dryer", "category": "Дрібна техніка", "brand": "Dyson", "color": "", "price": 17999, "original_price": 19999, "stock": 5, "rating": 4.8, "features": ["Air Multiplier", "Intelligent Heat"], "specs": {"Потужність": "1600 Вт", "Швидкостей": "3", "Насадки": "5"}},
            # Out of stock products
            {"name": "Холодильник Samsung RB38T602DSA (outlet)", "name_en": "Samsung RB38T602DSA Outlet", "category": "Холодильники", "brand": "Samsung", "color": "Silver", "price": 27999, "original_price": 27999, "stock": 0, "rating": 4.5, "features": ["No Frost", "Digital Inverter"], "specs": {"Енергоклас": "A++", "Об'єм": "385 л", "Висота": "185 см", "Колір": "Сріблястий"}},
            {"name": "Пилосос Dyson V15 Detect (outlet)", "name_en": "Dyson V15 Detect Outlet", "category": "Пилососи", "brand": "Dyson", "color": "", "price": 25999, "original_price": 25999, "stock": 0, "rating": 4.6, "features": ["Laser Slim", "Piezo Sensor"], "specs": {"Тип": "Бездротовий", "Потужність": "660 Вт", "Час роботи": "60 хв"}},
            {"name": "Мікрохвильова піч LG MS2336GIB (outlet)", "name_en": "LG MS2336GIB Outlet", "category": "Мікрохвильовки", "brand": "LG", "color": "Black", "price": 5999, "original_price": 5999, "stock": 0, "rating": 4.2, "features": ["EasyClean", "Smart Inverter"], "specs": {"Місткість": "23 л", "Потужність": "1000 Вт", "Тип": "Соло", "Колір": "Чорний"}},
            # Non-discounted products
            {"name": "Холодильник Haier C2F636CWRU", "name_en": "Haier C2F636CWRU Refrigerator", "category": "Холодильники", "brand": "Haier", "color": "White", "price": 22999, "original_price": 22999, "stock": 10, "rating": 4.3, "features": ["No Frost", "Total No Frost"], "specs": {"Енергоклас": "A+", "Об'єм": "320 л", "Висота": "176 см", "Колір": "Білий"}},
            {"name": "Холодильник Gorenje NRK6191MJ", "name_en": "Gorenje NRK6191MJ Refrigerator", "category": "Холодильники", "brand": "Gorenje", "color": "Gray", "price": 27999, "original_price": 27999, "stock": 7, "rating": 4.5, "features": ["MultiAirFlow", "FastFreeze"], "specs": {"Енергоклас": "A++", "Об'єм": "368 л", "Висота": "185 см", "Колір": "Сірий"}},
            {"name": "Пральна машина Samsung WW80K5210UW", "name_en": "Samsung WW80K5210UW Washing Machine", "category": "Пральні машини", "brand": "Samsung", "color": "", "price": 24999, "original_price": 24999, "stock": 12, "rating": 4.5, "features": ["EcoBubble", "Smart Check"], "specs": {"Завантаження": "8 кг", "Оберти": "1400", "Енергоклас": "A+++"}},
            {"name": "Пральна машина Indesit IWSC51051", "name_en": "Indesit IWSC51051 Washing Machine", "category": "Пральні машини", "brand": "Indesit", "color": "", "price": 12999, "original_price": 12999, "stock": 18, "rating": 4.1, "features": ["Push&Go", "Water Balance"], "specs": {"Завантаження": "5 кг", "Оберти": "1000", "Енергоклас": "A+"}},
            {"name": "Духовка Greta GOT710E0", "name_en": "Greta GOT710E0 Oven", "category": "Духовки", "brand": "Greta", "color": "White", "price": 12999, "original_price": 12999, "stock": 14, "rating": 4.2, "features": ["Gas Control", "Grill"], "specs": {"Тип": "Газова", "Об'єм": "60 л", "Колір": "Білий"}},
            {"name": "Мікрохвильова піч Panasonic NN-SM33LM", "name_en": "Panasonic NN-SM33LM Microwave", "category": "Мікрохвильовки", "brand": "Panasonic", "color": "", "price": 5499, "original_price": 5499, "stock": 20, "rating": 4.4, "features": ["Inverter", "TurboDefrost"], "specs": {"Місткість": "27 л", "Потужність": "1000 Вт", "Тип": "Соло"}},
            {"name": "Пилосос Rowenta Silence Force RO2953", "name_en": "Rowenta Silence Force RO2953 Vacuum", "category": "Пилососи", "brand": "Rowenta", "color": "", "price": 8999, "original_price": 8999, "stock": 15, "rating": 4.3, "features": ["SilenceForce", "High Performance"], "specs": {"Тип": "З мішком", "Потужність": "750 Вт", "Радіус дії": "10 м"}},
            {"name": "Пилосос Samsung SC8839", "name_en": "Samsung SC8839 Vacuum", "category": "Пилососи", "brand": "Samsung", "color": "", "price": 5499, "original_price": 5499, "stock": 22, "rating": 4.2, "features": ["CycloneForce", "Multi Cycle"], "specs": {"Тип": "Без мішка", "Потужність": "1600 Вт", "Місткість": "2 л"}},
            {"name": "Кавоварка Siemens EQ.3 s100", "name_en": "Siemens EQ.3 s100 Coffee Machine", "category": "Кавоварки", "brand": "Siemens", "color": "", "price": 22999, "original_price": 22999, "stock": 8, "rating": 4.5, "features": ["AromaDouble Shot", "CeramicDrive"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.4 л"}},
            {"name": "Кавоварка Krups Intuition Preference+", "name_en": "Krups Intuition Preference+ Coffee Machine", "category": "Кавоварки", "brand": "Krups", "color": "", "price": 15999, "original_price": 15999, "stock": 6, "rating": 4.3, "features": ["Latte Duo", "Intuition Cup"], "specs": {"Тип": "Автоматична", "Тиск": "15 бар", "Місткість": "1.6 л"}},
            {"name": "Аерогриль Philips HD9270/90", "name_en": "Philips HD9270/90 Airfryer", "category": "Дрібна техніка", "brand": "Philips", "color": "", "price": 7999, "original_price": 7999, "stock": 12, "rating": 4.6, "features": ["Twinstar", "Fat Removal"], "specs": {"Місткість": "4.1 л", "Потужність": "1400 Вт"}},
            {"name": "М'ясорубка Bosch MFW68660", "name_en": "Bosch MFW68660 Meat Grinder", "category": "Дрібна техніка", "brand": "Bosch", "color": "", "price": 6999, "original_price": 6999, "stock": 10, "rating": 4.5, "features": ["Anti-Slip", "Reverse Function"], "specs": {"Потужність": "700 Вт", "Макс. потужність": "1600 Вт"}},
            # Missing products (restored after git recovery)
            {"name": "Холодильник Beko RCNK560K20W", "name_en": "Beko RCNK560K20W Refrigerator", "category": "Холодильники", "brand": "Beko", "color": "White", "price": 18999, "original_price": 21999, "stock": 9, "rating": 4.3, "features": ["Neofrost", "IonGuard"], "specs": {"Енергоклас": "A++", "Об'єм": "340 л", "Висота": "183 см", "Колір": "Білий"}},
            {"name": "Духовка електрична Electrolux KODDP741X", "name_en": "Electrolux KODDP741X Electric Oven", "category": "Духовки", "brand": "Electrolux", "color": "Stainless", "price": 27999, "original_price": 31999, "stock": 5, "rating": 4.7, "features": ["SteamBake", "CoolToTouch"], "specs": {"Тип": "Електрична", "Об'єм": "72 л", "Енергоклас": "A++", "Колір": "Нержавійка"}},
            {"name": "Міні-піч Sharp R983INW", "name_en": "Sharp R983INW Mini Oven", "category": "Духовки", "brand": "Sharp", "color": "White", "price": 8999, "original_price": 10999, "stock": 12, "rating": 4.2, "features": ["Convection", "Grill", "Defrost"], "specs": {"Тип": "Міні-піч", "Місткість": "42 л", "Потужність": "2000 Вт", "Колір": "Білий"}},
            {"name": "Мікрохвильова піч Samsung MC32J7055CT", "name_en": "Samsung MC32J7055CT Microwave", "category": "Мікрохвильовки", "brand": "Samsung", "color": "Silver", "price": 10999, "original_price": 12999, "stock": 8, "rating": 4.5, "features": ["Ceramic Enamel", "Healthy Cooking"], "specs": {"Місткість": "32 л", "Потужність": "900 Вт", "Тип": "Соло+Гриль+Конвекція"}},
            {"name": "Електрочайник Xiaomi Mi Smart Kettle Pro", "name_en": "Xiaomi Mi Smart Kettle Pro", "category": "Дрібна техніка", "brand": "Xiaomi", "color": "", "price": 2499, "original_price": 2999, "stock": 35, "rating": 4.4, "features": ["Smart Control", "Keep Warm"], "specs": {"Місткість": "1.5 л", "Потужність": "1800 Вт", "Матеріал": "Нержавійка"}},
            # Climate Control products
            {"name": "Кондиціонер Samsung AR12TXHQBWKNER", "name_en": "Samsung AR12TXHQBWKNER Air Conditioner", "category": "Кліматична техніка", "brand": "Samsung", "color": "White", "price": 34999, "original_price": 39999, "stock": 7, "rating": 4.6, "features": ["Inverter", "WiFi", "Auto Clean"], "specs": {"Тип": "Спліт-система", "Потужність": "3.5 кВт", "Площа": "35 м²", "Колір": "Білий"}},
            {"name": "Кондиціонер LG S12WAN", "name_en": "LG S12WAN Air Conditioner", "category": "Кліматична техніка", "brand": "LG", "color": "White", "price": 27999, "original_price": 31999, "stock": 10, "rating": 4.4, "features": ["Inverter", "Dual Cool", "Plasmaster Ionizer"], "specs": {"Тип": "Спліт-система", "Потужність": "3.0 кВт", "Площа": "30 м²", "Колір": "Білий"}},
            {"name": "Обігрівач Electrolux EFH/C-3215", "name_en": "Electrolux EFH/C-3215 Heater", "category": "Кліматична техніка", "brand": "Electrolux", "color": "White", "price": 3999, "original_price": 4999, "stock": 25, "rating": 4.3, "features": ["Thermostat", "Overheat Protection", "Tip-over Switch"], "specs": {"Тип": "Конвектор", "Потужність": "2000 Вт", "Площа": "25 м²", "Колір": "Білий"}},
            {"name": "Зволожувач повітря Xiaomi Smart Humidifier 2", "name_en": "Xiaomi Smart Humidifier 2", "category": "Кліматична техніка", "brand": "Xiaomi", "color": "", "price": 4999, "original_price": 5499, "stock": 18, "rating": 4.5, "features": ["Smart Control", "Top-Fill", "UV Sterilization"], "specs": {"Місткість": "4.5 л", "Площа": "28 м²", "Потужність": "38 Вт", "Колір": "Білий"}},
        ]

        cat_map = {c.name: c for c in Category.objects.all()}

        for p_data in products_data:
            cat_name = p_data.pop("category")
            name_en = p_data.pop("name_en")
            category = cat_map.get(cat_name)
            if not category:
                continue

            product, created = Product.objects.get_or_create(
                name=p_data["name"],
                defaults={
                    "name_en": name_en,
                    "category": category,
                    "description": f"{p_data['name']} — надійна побутова техніка. Висока якість, енергоефективність та сучасний дизайн.",
                    "description_en": f"{name_en} — reliable home appliance. High quality, energy efficiency and modern design.",
                    "price": Decimal(str(p_data["price"])),
                    "original_price": Decimal(str(p_data["original_price"])),
                    "stock": p_data["stock"],
                    "rating": Decimal(str(p_data["rating"])),
                    "features": p_data.get("features", []),
                    "specs": p_data.get("specs", {}),
                    "brand": p_data.get("brand", ""),
                    "color": p_data.get("color", ""),
                },
            )
            if not created:
                product.name_en = name_en
                product.brand = p_data.get("brand", "")
                product.color = p_data.get("color", "")
                product.price = Decimal(str(p_data["price"]))
                product.original_price = Decimal(str(p_data["original_price"]))
                product.stock = p_data["stock"]
                product.rating = Decimal(str(p_data["rating"]))
                product.description_en = f"{name_en} — reliable home appliance. High quality, energy efficiency and modern design."
                product.save()
            self._set_placeholder_image(product, name_en, cat_name)
            if created:
                self.stdout.write(f"  Created product: {product.name}")

        # ── Spread timestamps across past 90 days ──
        now = timezone.now()
        product_names = [p["name"] for p in products_data]
        all_products = list(Product.objects.filter(name__in=product_names))
        if not all_products:
            return

        # 1. Assign each product a random created_at over the past 90 days
        for product in all_products:
            days_ago = random.randint(0, 90)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            Product.objects.filter(pk=product.pk).update(created_at=created_at)

        # 2. Mark 3-5 products as "new arrivals" (created within last 7 days)
        new_count = min(random.randint(3, 5), len(all_products))
        new_arrivals = random.sample(all_products, new_count)
        for product in new_arrivals:
            days_ago = random.randint(0, 6)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            features = list(product.features or [])
            if not any(isinstance(f, dict) and "badge" in f for f in features):
                features.append({"badge": "new"})
            Product.objects.filter(pk=product.pk).update(created_at=created_at, features=features)

        # Re-query to pick up updated created_at values
        all_products = list(Product.objects.filter(name__in=product_names))

        # 3. Set updated_at a few days after created_at for all products
        for product in all_products:
            if product.created_at:
                days_after = random.randint(1, 14)
                updated_at = product.created_at + timedelta(days=days_after, hours=random.randint(0, 23))
                if updated_at > now:
                    updated_at = now
                Product.objects.filter(pk=product.pk).update(updated_at=updated_at)

        # 4. Simulate restock events for 5-8 products (recent updated_at)
        restock_count = min(random.randint(5, 8), len(all_products))
        restock_products = random.sample(all_products, restock_count)
        for product in restock_products:
            days_ago = random.randint(0, 14)
            updated_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            features = list(product.features or [])
            if not any(isinstance(f, dict) and f.get("restocked") for f in features):
                features.append({"restocked": True})
            Product.objects.filter(pk=product.pk).update(updated_at=updated_at, features=features)

    def _set_placeholder_image(self, product, name_en, cat_name):
        cat_palette = {
            "Холодильники": ((227, 242, 253), (21, 101, 192)),
            "Пральні машини": ((232, 245, 233), (46, 125, 50)),
            "Духовки": ((255, 243, 224), (230, 81, 0)),
            "Мікрохвильовки": ((243, 229, 245), (106, 27, 154)),
            "Пилососи": ((224, 247, 250), (0, 105, 92)),
            "Кавоварки": ((252, 228, 236), (198, 40, 40)),
            "Дрібна техніка": ((255, 248, 225), (245, 127, 23)),
            "Кліматична техніка": ((224, 242, 254), (3, 105, 161)),
        }
        bg, fg = cat_palette.get(cat_name, ((245, 245, 245), (51, 51, 51)))

        img = Image.new("RGB", (400, 400), bg)
        draw = ImageDraw.Draw(img)
        label = name_en.replace("&", "and")
        short = textwrap.shorten(label, width=24, placeholder="")

        try:
            font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
            font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            draw.text((200, 140), short, fill=fg, font=font_lg, anchor="mm")
            draw.text((200, 260), "TechHub placeholder", fill=fg, font=font_sm, anchor="mm")
        except (IOError, OSError):
            font = ImageFont.load_default()
            draw.text((10, 10), short, fill=fg, font=font)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        filename = f"product_{product.pk}.png"
        product.image.save(filename, ContentFile(buf.getvalue()), save=False)
        product.save(update_fields=["image"])

    def _set_category_placeholder(self, cat, name_en):
        palettes = [
            ("#e3f2fd", "#1565c0"),
            ("#e8f5e9", "#2e7d32"),
            ("#fff3e0", "#e65100"),
            ("#f3e5f5", "#6a1b9a"),
            ("#e0f7fa", "#00695c"),
            ("#fce4ec", "#c62828"),
            ("#fff8e1", "#f57f17"),
            ("#f1f8e9", "#558b2f"),
            ("#ede7f6", "#4527a0"),
            ("#fbe9e7", "#bf360c"),
        ]
        bg, fg = palettes[cat.pk % len(palettes)]

        img = Image.new("RGB", (400, 300), bg)
        draw = ImageDraw.Draw(img)
        label = name_en.replace("&", "and")
        short = textwrap.shorten(label, width=20, placeholder="")

        try:
            font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
            draw.text((200, 110), short, fill=fg, font=font_lg, anchor="mm")
            draw.text((200, 210), "TechHub category", fill=fg, font=font_sm, anchor="mm")
        except (IOError, OSError):
            font = ImageFont.load_default()
            draw.text((10, 10), short, fill=fg, font=font)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        filename = f"category_{cat.pk}.png"
        cat.image.save(filename, ContentFile(buf.getvalue()), save=False)
        cat.save(update_fields=["image"])
