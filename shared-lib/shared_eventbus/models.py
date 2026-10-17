from django.db import models


class OutboxEvent(models.Model):
    """An event the broker did not accept yet; outbox.relay_pending() re-sends it."""

    routing_key = models.CharField(max_length=255)
    payload = models.JSONField()
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eventbus_outbox"
        ordering = ["id"]
