from django.core.management.base import BaseCommand

from shared_eventbus.outbox import relay_pending


class Command(BaseCommand):
    help = "Publish events queued in the outbox while RabbitMQ was unavailable"

    def handle(self, *args, **options):
        left = relay_pending()
        self.stdout.write(f"Outbox: {left} event(s) still pending")
