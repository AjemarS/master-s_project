import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

// Same metric names as the Django services (shared_metrics), so one dashboard covers all of them.
// The registry is global: a module loaded twice (tests reset modules) must not register twice.
if (!client.register.getSingleMetric("process_cpu_user_seconds_total")) client.collectDefaultMetrics();

const requests = (client.register.getSingleMetric("http_requests_total") as client.Counter<string>) ?? new client.Counter({
  name: "http_requests_total",
  help: "HTTP requests handled",
  labelNames: ["method", "route", "status"],
});
const latency = (client.register.getSingleMetric("http_request_duration_seconds") as client.Histogram<string>) ?? new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Time to produce a response",
  labelNames: ["method", "route"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/** The matched route pattern; for handlers without one (e.g. Better Auth) the first two path segments, never ids or tokens */
function routeOf(req: Request): string {
  if (req.route?.path) return `${req.baseUrl}${req.route.path}`;
  return "/" + req.path.split("/").filter(Boolean).slice(0, 2).join("/");
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/metrics") return next();
  const stop = latency.startTimer();
  res.on("finish", () => {
    const route = routeOf(req);
    stop({ method: req.method, route });
    requests.inc({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}

/** Scraped by Prometheus inside the compose network; the gateway does not proxy /metrics */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
}
