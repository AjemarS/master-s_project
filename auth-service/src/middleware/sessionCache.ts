import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { redisClient } from "./rateLimiter";

const CACHE_PREFIX = "session:";
const CACHE_TTL = 60 * 60 * 24;

function getSessionToken(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = typeof headers.cookie === "string" ? headers.cookie
    : Array.isArray(headers.cookie) ? headers.cookie[0]
    : undefined;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0 && part.substring(0, idx).trim() === "better-auth.session_token") {
      return part.substring(idx + 1).trim();
    }
  }
  return null;
}

export async function getSessionFromCacheOrProvider(
  headers: Record<string, string | string[] | undefined>,
) {
  const token = getSessionToken(headers);
  if (token) {
    try {
      const cached = await redisClient.get(`${CACHE_PREFIX}${token}`);
      if (cached) return JSON.parse(cached);
    } catch { /* cache miss — fall through */ }
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });

  if (session && token) {
    try {
      await redisClient.setex(`${CACHE_PREFIX}${token}`, CACHE_TTL, JSON.stringify(session));
    } catch { /* non-critical */ }
  }

  return session;
}

export async function invalidateSessionCache(token: string) {
  try {
    await redisClient.del(`${CACHE_PREFIX}${token}`);
  } catch { /* non-critical */ }
}
