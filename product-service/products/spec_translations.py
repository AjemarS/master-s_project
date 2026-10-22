"""English for the spec names and values the catalog seed uses; anything unknown is kept as is."""

import re

KEYS = {
    "Енергоклас": "Energy class",
    "Об'єм": "Capacity",
    "Висота": "Height",
    "Колір": "Colour",
    "Завантаження": "Load",
    "Оберти": "Spin speed, rpm",
    "Рівень шуму": "Noise level",
    "Тип": "Type",
    "Місткість": "Capacity",
    "Потужність": "Power",
    "Час роботи": "Run time",
    "Радіус дії": "Range",
    "Тиск": "Pressure",
    "Матеріал": "Material",
    "Швидкостей": "Speeds",
    "Насадки": "Attachments",
    "Макс. потужність": "Max power",
    "Площа": "Room area",
}

VALUES = {
    "Білий": "White",
    "Нержавійка": "Stainless steel",
    "Сріблястий": "Silver",
    "Сірий": "Grey",
    "Чорний": "Black",
    "Автоматична": "Automatic",
    "Без мішка": "Bagless",
    "Бездротова": "Cordless",
    "Бездротовий": "Cordless",
    "Вологий+сухий": "Wet and dry",
    "Газова": "Gas",
    "Електрична": "Electric",
    "З мішком": "Bagged",
    "Капсульна": "Capsule",
    "Конвектор": "Convector",
    "Міні-піч": "Mini oven",
    "Робот-пилосос": "Robot vacuum",
    "Ручна": "Manual",
    "Соло": "Solo",
    "Соло+Гриль": "Solo + grill",
    "Соло+Гриль+Конвекція": "Solo + grill + convection",
    "Спліт-система": "Split system",
}

UNITS = {
    "кВт": "kW", "Вт": "W", "мл": "ml", "л": "L", "см": "cm",
    "кг": "kg", "хв": "min", "м²": "m²", "м": "m", "бар": "bar",
}

_AMOUNT = re.compile(r"^([\d.,]+)\s*(\S+)$")


def value_to_en(value):
    if not isinstance(value, str):
        return value
    if value in VALUES:
        return VALUES[value]
    m = _AMOUNT.match(value)
    if m and m.group(2) in UNITS:
        return f"{m.group(1)} {UNITS[m.group(2)]}"
    return value


def specs_to_en(specs):
    return {KEYS.get(k, k): value_to_en(v) for k, v in (specs or {}).items()}
