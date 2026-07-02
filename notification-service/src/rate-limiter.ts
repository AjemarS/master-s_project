import type { Request, Response, NextFunction } from "express";

const buckets = new Map<string, number[]>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export function rateLimit({ max, windowMs }: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.headers["x-gateway-user-id"] as string) || req.ip || "unknown";
    const now = Date.now();

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }

    const timestamps = buckets.get(key)!.filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    timestamps.push(now);
    buckets.set(key, timestamps);
    next();
  };
}

export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of buckets) {
      const valid = timestamps.filter(t => now - t < 60000);
      if (valid.length === 0) buckets.delete(key);
      else buckets.set(key, valid);
    }
  }, 60000);
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
