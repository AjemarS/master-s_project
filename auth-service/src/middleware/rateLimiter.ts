import Redis from "ioredis";
import { Request, Response, NextFunction } from "express";
import logger from "../logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error", { error: err.message });
});

redisClient.on("connect", () => {
  logger.info("Redis connected for rate limiting");
});

const ATTEMPT_KEY = "rl:attempt:";
const BLOCK_KEY = "rl:block:";
const ADMIN_KEY = "rl:admin:";

const RECORD_LOGIN_LUA = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
  if count >= 50 then redis.call('SETEX', KEYS[2], 3600, '1') return {1, 3600}
  elseif count >= 20 then redis.call('SETEX', KEYS[2], 1800, '1') return {1, 1800}
  elseif count >= 10 then redis.call('SETEX', KEYS[2], 300, '1') return {1, 300}
  elseif count >= 5 then redis.call('SETEX', KEYS[2], 60, '1') return {1, 60} end
  return {0, 0}
`;

const ADMIN_RATE_LUA = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end
  if count > tonumber(ARGV[1]) then
    local ttl = redis.call('TTL', KEYS[1])
    return {0, ttl}
  end
  return {1, 0}
`;

let recordLoginSHA = "";
let adminRateSHA = "";

async function loadScripts() {
  try {
    recordLoginSHA = await redisClient.script("LOAD", RECORD_LOGIN_LUA) as string;
    adminRateSHA = await redisClient.script("LOAD", ADMIN_RATE_LUA) as string;
    logger.info("Rate limiter Lua scripts loaded");
  } catch (err) {
    logger.warn("Failed to load Lua scripts, using non-atomic fallback", {
      error: (err as Error).message,
    });
  }
}

export async function checkLoginRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const blockKey = `${BLOCK_KEY}${ip}`;
  const blockTTL = await redisClient.ttl(blockKey);
  if (blockTTL > 0) {
    return { allowed: false, retryAfter: blockTTL };
  }
  return { allowed: true };
}

export async function recordFailedAttempt(ip: string): Promise<{
  blocked: boolean;
  blockDuration?: number;
}> {
  const attemptKey = `${ATTEMPT_KEY}${ip}`;
  const blockKey = `${BLOCK_KEY}${ip}`;

  if (recordLoginSHA) {
    try {
      const result = await redisClient.evalsha(recordLoginSHA, 2, attemptKey, blockKey) as [number, number];
      return { blocked: result[0] === 1, blockDuration: result[1] || undefined };
    } catch { /* script may be flushed, fall through */ }
  }

  try {
    const result = await redisClient.eval(RECORD_LOGIN_LUA, 2, attemptKey, blockKey) as [number, number];
    return { blocked: result[0] === 1, blockDuration: result[1] || undefined };
  } catch {
    const count = await redisClient.incr(attemptKey);
    if (count === 1) await redisClient.expire(attemptKey, 3600);
    let blockDuration: number | null = null;
    if (count >= 50) blockDuration = 3600;
    else if (count >= 20) blockDuration = 1800;
    else if (count >= 10) blockDuration = 300;
    else if (count >= 5) blockDuration = 60;
    if (blockDuration) {
      await redisClient.setex(blockKey, blockDuration, "1");
      return { blocked: true, blockDuration };
    }
    return { blocked: false };
  }
}

export async function resetLoginRateLimit(ip: string): Promise<void> {
  const attemptKey = `${ATTEMPT_KEY}${ip}`;
  const blockKey = `${BLOCK_KEY}${ip}`;
  await Promise.all([redisClient.del(attemptKey), redisClient.del(blockKey)]);
}

export async function checkAdminRateLimit(userId: string, ip: string, method: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const maxRequests = method === "GET" ? 30 : 10;
  const key = `${ADMIN_KEY}${userId}:${ip}`;

  if (adminRateSHA) {
    try {
      const result = await redisClient.evalsha(adminRateSHA, 1, key, String(maxRequests)) as [number, number];
      return { allowed: result[0] === 1, retryAfter: result[1] || undefined };
    } catch { /* fall through */ }
  }

  try {
    const result = await redisClient.eval(ADMIN_RATE_LUA, 1, key, String(maxRequests)) as [number, number];
    return { allowed: result[0] === 1, retryAfter: result[1] || undefined };
  } catch {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, 60);
    if (count > maxRequests) {
      const ttl = await redisClient.ttl(key);
      return { allowed: false, retryAfter: Math.max(0, ttl) };
    }
    return { allowed: true };
  }
}

export async function adminRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = (res.locals.user?.id as string) || "unknown";
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  try {
    const result = await checkAdminRateLimit(userId, ip, req.method);
    if (!result.allowed) {
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
      return;
    }
  } catch (err) {
    logger.warn("Admin rate limiter unavailable, allowing request", {
      error: (err as Error).message,
    });
  }
  next();
}

export async function initRateLimiter(): Promise<void> {
  try {
    await redisClient.connect();
    await loadScripts();
  } catch (err) {
    logger.warn("Rate limiter running in degraded mode (Redis unavailable)", {
      error: (err as Error).message,
    });
  }
}
