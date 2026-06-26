import logging

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from orders.eventbus import publish_event
from orders.models import Order

logger = logging.getLogger(__name__)


def _build_order_event(order):
    from uuid import uuid4

    return {
        "event_id": str(uuid4()),
        "order_id": order.id,
        "order_number": order.order_number,
        "channel": order.channel,
        "status": order.status,
        "warehouse_id": order.warehouse_id,
        "total_amount": str(order.total_amount),
        "customer_email": order.customer_email,
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "price": str(item.price),
            }
            for item in order.items.all()
        ],
    }


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
        )

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
            order.status = Order.CANCELLED
            order.payment_status = Order.PAYMENT_REFUNDED
            order.save(update_fields=["status", "payment_status"])

            transaction.on_commit(
                lambda: publish_event("order.cancelled", _build_order_event(order))
            )

        self.stdout.write(self.style.SUCCESS(f"    Cancelled"))

    def _release_reserved_stock(self, order):
        if not order.warehouse_id:
            return

        for item in order.items.all():
            url = f"{settings.INVENTORY_SERVICE_URL}/api/stock/release/"
            try:
                resp = requests.post(
                    url,
                    json={
                        "product_id": item.product_id,
                        "warehouse_id": order.warehouse_id,
                        "quantity": item.quantity,
                        "reference_type": "order",
                        "reference_id": str(order.id),
                        "idempotency_key": f"release-{order.id}-{item.product_id}",
                    },
                    timeout=10,
                )
                if resp.status_code not in (200, 201, 409):
                    logger.warning(
                        "Release failed | order=%s product=%s status=%s",
                        order.order_number, item.product_id, resp.status_code,
                    )
            except requests.RequestException as e:
                logger.error(
                    "Release request failed | order=%s product=%s error=%s",
                    order.order_number, item.product_id, e,
                )
