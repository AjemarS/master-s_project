from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from products.models import ProcessedEvent


class Command(BaseCommand):
    help = "Remove ProcessedEvent records older than the given days"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=7,
            help="Delete events older than this many days (default: 7)",
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        deleted, _ = ProcessedEvent.objects.filter(processed_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} old processed events"))
