"""
Promo codes: whether a code applies to an order, how much it takes off, and counting its uses.
"""
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import F, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from orders.models import Order, PromoCode

CENT = Decimal("0.01")


def _reject(message):
    raise ValidationError({"promo_code": message})


def discount_for(promo, subtotal):
    """Never more than the goods cost: a fixed code on a small order makes it free, not negative."""
    if promo.kind == PromoCode.PERCENT:
        amount = (subtotal * promo.value / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    else:
        amount = promo.value
    return min(amount, subtotal)


def evaluate(code, subtotal, customer_email="", created_by="", lock=False):
    """
    (promo, discount) for a code on a goods subtotal, or a 400 explaining why it does not apply.
    lock=True takes a row lock: use it inside the transaction that records the use.
    """
    qs = PromoCode.objects.select_for_update() if lock else PromoCode.objects
    promo = qs.filter(code=code.strip().upper()).first()
    now = timezone.now()
    if not promo or not promo.is_active:
        _reject("This promo code does not exist or is no longer active.")
    if promo.starts_at and now < promo.starts_at:
        _reject("This promo code is not active yet.")
    if promo.ends_at and now > promo.ends_at:
        _reject("This promo code has expired.")
    if promo.max_uses is not None and promo.used_count >= promo.max_uses:
        _reject("This promo code has been used up.")
    if subtotal < promo.min_order_amount:
        _reject(f"This promo code needs an order of at least {promo.min_order_amount} UAH.")
    if promo.once_per_customer and (customer_email or created_by):
        who = Q()
        if customer_email:
            who |= Q(customer_email__iexact=customer_email)
        if created_by:
            who |= Q(created_by=created_by)
        if Order.objects.filter(who, promo_code=promo).exclude(status=Order.CANCELLED).exists():
            _reject("You have already used this promo code.")
    return promo, discount_for(promo, subtotal)


def record_use(promo):
    PromoCode.objects.filter(pk=promo.pk).update(used_count=F("used_count") + 1)


def release_use(order):
    """A cancelled order gives its use back, so a limited code is not lost to an abandoned cart."""
    if order.promo_code_id:
        PromoCode.objects.filter(pk=order.promo_code_id, used_count__gt=0).update(used_count=F("used_count") - 1)
