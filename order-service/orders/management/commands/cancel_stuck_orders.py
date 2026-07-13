import logging

import stripe
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from orders.eventbus import publish_event
from orders.event_builder import build_order_event
from orders.inventory_client import release_stock as release_inventory_stock
from orders.models import Order

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


class Command(BaseCommand):
    help = "Cancel paid orders stuck without stock reservation (saga compensation)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--timeout-minutes",
            type=int,
            default=30,
            help="Orders paid longer than this many minutes are considered stuck",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only report stuck orders without cancelling",
        )

    def handle(self, *args, **options):
        timeout_minutes = options["timeout_minutes"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timezone.timedelta(minutes=timeout_minutes)

        stuck = Order.objects.filter(
            status=Order.PAID,
            paid_at__lt=cutoff,
        ).prefetch_related("items")

        self.stdout.write(f"Found {stuck.count()} stuck orders (paid > {timeout_minutes} min ago)")

        for order in stuck:
            self._cancel_order(order, dry_run)

    def _cancel_order(self, order, dry_run):
        self.stdout.write(f"  Cancelling order {order.order_number} ({order.id})")

        if dry_run:
            return

        try:
            self._release_reserved_stock(order)
        except Exception as e:
            logger.error("Stock release failed during compensation | order=%s error=%s", order.order_number, e)
            self.stdout.write(self.style.WARNING(f"    Stock release failed: {e}"))

        with transaction.atomic():
            # Actually refund the Stripe payment
            if order.stripe_payment_intent_id:
                try:
                    stripe.Refund.create(payment_intent=order.stripe_payment_intent_id)
                    logger.info("Stripe refunded | order=%s intent=%s", order.order_number, order.stripe_payment_intent_id)
                except stripe.error.StripeError as e:
                    logger.error("Stripe refund failed | order=%s error=%s", order.order_number, e)
            order.status = Order.CANCELLED
            order.payment_status = Order.PAYMENT_REFUNDED
            order.save(update_fields=["status", "payment_status"])

            transaction.on_commit(
                lambda o=order: publish_event("order.cancelled", build_order_event(o))
            )

        self.stdout.write(self.style.SUCCESS(f"    Cancelled"))

    def _release_reserved_stock(self, order):
        if not order.warehouse_id:
            return

        for item in order.items.all():
            release_inventory_stock(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                quantity=item.quantity,
                reference_type="order",
                reference_id=str(order.id),
                idempotency_key=f"release-{order.id}-{item.product_id}",
            )
