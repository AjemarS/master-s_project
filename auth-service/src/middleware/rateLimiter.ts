/**
 * Redis-backed rate limiter for brute-force protection.
 * Tracks failed login attempts per IP address with exponential backoff.
 * Replaces the previous in-memory Map implementation.
 */

import Redis from "ioredis";
import logger from "../logger";

// Redis connection
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  logger.error("Redis connection error", { error: err.message });
});

redis.on("connect", () => {
  logger.info("Redis connected for rate limiting");
});

// Key prefixes
const ATTEMPT_KEY = "rl:attempt:";
const BLOCK_KEY = "rl:block:";

/**
 * Check if an IP should be rate limited for sign-in attempts.
 *
 * Policy:
 * - 5 failed attempts = 1 minute block
 * - 10 failed attempts = 5 minute block
 * - 20 failed attempts = 30 minute block
 * - 50+ failed attempts = 1 hour block
 * - Window resets after successful login or block expiry
 */
export async function checkLoginRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  // Check if currently blocked
  const blockKey = `${BLOCK_KEY}${ip}`;
  const blockTTL = await redis.ttl(blockKey);

  if (blockTTL > 0) {
    return { allowed: false, retryAfter: blockTTL };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt for an IP.
 * Returns the updated block status.
 */
export async function recordFailedAttempt(ip: string): Promise<{
  blocked: boolean;
  blockDuration?: number;
}> {
  const attemptKey = `${ATTEMPT_KEY}${ip}`;
  const blockKey = `${BLOCK_KEY}${ip}`;

  // Increment attempt count (expires after 1 hour of inactivity)
  const count = await redis.incr(attemptKey);
  if (count === 1) {
    await redis.expire(attemptKey, 3600); // 1 hour window
  }

  // Determine block duration based on count
  let blockDuration: number | null = null;

  if (count >= 50) {
    blockDuration = 3600; // 1 hour
  } else if (count >= 20) {
    blockDuration = 1800; // 30 minutes
  } else if (count >= 10) {
    blockDuration = 300; // 5 minutes
  } else if (count >= 5) {
    blockDuration = 60; // 1 minute
  }

  if (blockDuration) {
    await redis.setex(blockKey, blockDuration, "1");
    return { blocked: true, blockDuration };
  }

  return { blocked: false };
}

/**
 * Reset rate limit for an IP on successful login.
 */
export async function resetLoginRateLimit(ip: string): Promise<void> {
  const attemptKey = `${ATTEMPT_KEY}${ip}`;
  const blockKey = `${BLOCK_KEY}${ip}`;

  await Promise.all([redis.del(attemptKey), redis.del(blockKey)]);
}

/**
 * Initialize Redis connection (called on startup).
 */
export async function initRateLimiter(): Promise<void> {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn("Rate limiter running in degraded mode (Redis unavailable)", {
      error: (err as Error).message,
    });
  }
}