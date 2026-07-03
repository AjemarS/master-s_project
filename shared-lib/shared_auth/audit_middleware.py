"""
Django middleware that captures HTTP request/response audit events.
Sends async fire-and-forget POST to audit-service.
"""
import logging
import threading
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AUDIT_SERVICE_URL = getattr(settings, "AUDIT_SERVICE_URL", "http://audit-service:8005")


class AuditMiddleware:
    """Logs HTTP request metadata to the central audit-service."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration_ms = int((time.time() - start) * 1000)

        threading.Thread(
            target=self._send,
            args=(request, response, duration_ms),
            daemon=True,
        ).start()

        return response

    def _send(self, request, response, duration_ms):
        try:
            requests.post(
                f"{AUDIT_SERVICE_URL}/api/audit/log",
                json={
                    "request_id": request.META.get("HTTP_X_REQUEST_ID", ""),
                    "event_type": "http_request",
                    "service": request.META.get("HTTP_HOST", "unknown"),
                    "method": request.method,
                    "path": request.path,
                    "user_id": request.META.get("HTTP_X_GATEWAY_USER_ID", ""),
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
                timeout=1,
            )
        except requests.RequestException:
            pass
