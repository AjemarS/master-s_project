"""
Prometheus metrics for the Django services: request rate, errors and latency, plus a /metrics view.

With gunicorn's several workers set PROMETHEUS_MULTIPROC_DIR to an empty directory before start,
so every scrape sums all workers instead of reporting whichever one answered.
"""
import os
import time

from django.http import HttpResponse
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Histogram, generate_latest, multiprocess
from prometheus_client import REGISTRY

REQUESTS = Counter(
    "http_requests_total", "HTTP requests handled", ["method", "route", "status"],
)
LATENCY = Histogram(
    "http_request_duration_seconds", "Time to produce a response", ["method", "route"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)


class PrometheusMiddleware:
    """Labels by the URL pattern (orders/<pk>/), never the raw path, so ids do not explode the series."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/metrics":
            return self.get_response(request)
        start = time.perf_counter()
        response = self.get_response(request)
        match = getattr(request, "resolver_match", None)
        route = match.route if match and match.route else "unmatched"
        LATENCY.labels(request.method, route).observe(time.perf_counter() - start)
        REQUESTS.labels(request.method, route, str(response.status_code)).inc()
        return response


def metrics_view(request):
    # Reachable only inside the compose network: the gateway proxies /api/*, not /metrics
    if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
    else:
        registry = REGISTRY
    return HttpResponse(generate_latest(registry), content_type=CONTENT_TYPE_LATEST)
