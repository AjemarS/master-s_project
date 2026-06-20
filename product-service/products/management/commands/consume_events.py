import logging

from django.core.management.base import BaseCommand

from products.eventbus import start_consumer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Start RabbitMQ consumer for product events"

    def handle(self, *args, **options):
        self.stdout.write("Starting product event consumer...")
        start_consumer()
