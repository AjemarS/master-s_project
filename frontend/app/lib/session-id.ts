/**
 * Session ID management using cookies for cart persistence.
 * Cookies persist across browser sessions (closing/opening browser).
 */

const SESSION_ID_COOKIE = "techhub_session_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function getSessionId(): string {
  let sid = getCookie(SESSION_ID_COOKIE);
  if (!sid) {
    sid = crypto.randomUUID();
    setCookie(SESSION_ID_COOKIE, sid, COOKIE_MAX_AGE);
  }
  return sid;
}
