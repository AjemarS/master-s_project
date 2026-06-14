/**
 * Simple in-memory rate limiter for brute-force protection.
 * Tracks failed login attempts per IP address with exponential backoff.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

const ipStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipStore.entries()) {
    // Remove entries older than 1 hour with no active block
    if (now - entry.lastAttempt > 3600000 && !entry.blockedUntil) {
      ipStore.delete(ip);
    }
    // Remove expired blocks
    if (entry.blockedUntil && now > entry.blockedUntil) {
      entry.blockedUntil = null;
      entry.count = 0;
      entry.firstAttempt = now;
    }
  }
}, 600000);

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
export function checkLoginRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  let entry = ipStore.get(ip);

  if (!entry) {
    entry = { count: 0, firstAttempt: now, lastAttempt: now, blockedUntil: null };
    ipStore.set(ip, entry);
  }

  // Check if currently blocked
  if (entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter };
    }
    // Block expired, reset
    entry.blockedUntil = null;
    entry.count = 0;
    entry.firstAttempt = now;
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt for an IP.
 * Returns the updated block status.
 */
export function recordFailedAttempt(ip: string): {
  blocked: boolean;
  blockDuration?: number;
} {
  const now = Date.now();
  let entry = ipStore.get(ip);

  if (!entry) {
    entry = { count: 0, firstAttempt: now, lastAttempt: now, blockedUntil: null };
    ipStore.set(ip, entry);
  }

  entry.count += 1;
  entry.lastAttempt = now;

  // Determine if we should block based on count
  let blockDuration: number | null = null;

  if (entry.count >= 50) {
    blockDuration = 3600; // 1 hour
  } else if (entry.count >= 20) {
    blockDuration = 1800; // 30 minutes
  } else if (entry.count >= 10) {
    blockDuration = 300; // 5 minutes
  } else if (entry.count >= 5) {
    blockDuration = 60; // 1 minute
  }

  if (blockDuration) {
    entry.blockedUntil = now + blockDuration * 1000;
    return { blocked: true, blockDuration };
  }

  return { blocked: false };
}

/**
 * Reset rate limit for an IP on successful login.
 */
export function resetLoginRateLimit(ip: string): void {
  ipStore.delete(ip);
}