import logging

from django.core.management.base import BaseCommand

from inventory.eventbus import start_consumer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Start RabbitMQ consumer for inventory events"

    def handle(self, *args, **options):
        self.stdout.write("Starting inventory event consumer...")
        start_consumer()
