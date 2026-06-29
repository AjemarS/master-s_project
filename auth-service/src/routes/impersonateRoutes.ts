import { Router, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, pool } from "../auth";
import { requireAdmin } from "../middleware/authMiddleware";
import { getSessionFromCacheOrProvider } from "../middleware/sessionCache";
import { writeAuditLog } from "../middleware/auditLog";
import { redisClient, adminRateLimit } from "../middleware/rateLimiter";
import { apiImpersonateUser, apiStopImpersonating, getSetCookieHeaders } from "../helpers/betterAuth";
import { sendImpersonationCode } from "../email/sender";
import logger from "../logger";

const router = Router();

const memoryStore = new Map<string, { code: string; expiresAt: Date }>();
let redisAvailable = true;

setInterval(() => {
  const now = new Date();
  for (const [email, entry] of memoryStore) {
    if (entry.expiresAt < now) memoryStore.delete(email);
  }
}, 300_000);

async function storeCode(email: string, code: string): Promise<void> {
  const ttl = 300;
  try {
    if (redisAvailable) {
      await redisClient.setex(`impersonate:code:${email}`, ttl, code);
      return;
    }
  } catch {
    redisAvailable = false;
  }
  memoryStore.set(email, { code, expiresAt: new Date(Date.now() + ttl * 1000) });
}

async function getCode(email: string): Promise<string | null> {
  try {
    if (redisAvailable) {
      const code = await redisClient.get(`impersonate:code:${email}`);
      return code;
    }
  } catch {
    redisAvailable = false;
  }
  const entry = memoryStore.get(email);
  if (!entry || entry.expiresAt < new Date()) {
    memoryStore.delete(email);
    return null;
  }
  return entry.code;
}

async function deleteCode(email: string): Promise<void> {
  try {
    if (redisAvailable) {
      await redisClient.del(`impersonate:code:${email}`);
      return;
    }
  } catch {
    redisAvailable = false;
  }
  memoryStore.delete(email);
}

function forwardSetCookie(response: { headers?: Record<string, string | string[]> }, res: Response): void {
  const value = getSetCookieHeaders(response);
  if (value !== undefined) {
    res.setHeader("Set-Cookie", value);
  }
}

router.post("/admin/stop-impersonation", async (req: Request, res: Response) => {
  try {
    const response = await apiStopImpersonating(req.headers);
    forwardSetCookie(response, res);
    if (response.user?.id) {
      writeAuditLog({ actorId: response.user.id, action: "stopImpersonation", ipAddress: req.ip || req.socket.remoteAddress });
    }
    return res.json({ success: true, message: "Impersonation stopped" });
  } catch (error: unknown) {
    logger.error("Stop impersonation failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to stop impersonation" });
  }
});

router.post("/admin/impersonate", requireAdmin, adminRateLimit, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const adminSession = await getSessionFromCacheOrProvider(req.headers);
    if (!adminSession) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const userResult = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const response = await apiImpersonateUser(userId, req.headers);
    forwardSetCookie(response, res);
    writeAuditLog({ actorId: adminSession.user.id, action: "impersonate", targetId: userId, ipAddress: req.ip });
    return res.json({ success: true, message: "Impersonation started", user: response.user });
  } catch (error: unknown) {
    logger.error("Impersonation failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: (error as Error).message || "Impersonation failed" });
  }
});

router.post("/impersonate/request-code", async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const userResult = await pool.query(
      'SELECT id, name, email FROM "user" WHERE email = $1',
      [userEmail]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await storeCode(userEmail, code);

    await sendImpersonationCode(userEmail, code);
    console.log(`[dev] Impersonation code for ${userEmail}: ${code}`);
    res.json({ success: true, message: "Код надіслано на email", email: userEmail });

  } catch (error: unknown) {
    logger.error("Failed to request impersonation code", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to send code" });
  }
});

router.post("/impersonate/verify-code", async (req: Request, res: Response) => {
  try {
    const { userEmail, code } = req.body;
    if (!userEmail || !code) {
      return res.status(400).json({ success: false, message: "userEmail and code are required" });
    }

    const storedCode = await getCode(userEmail);
    if (!storedCode) {
      return res.status(400).json({ success: false, message: "No code requested or code expired" });
    }

    if (storedCode !== code) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    const userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userId = userResult.rows[0].id;
    await deleteCode(userEmail);

    const response = await auth.api.impersonateUser({
      headers: fromNodeHeaders(req.headers),
      body: { userId },
    }) as Record<string, unknown>;

    forwardSetCookie(response, res);
    writeAuditLog({ actorId: req.body.userEmail || "unknown", action: "verifyImpersonationCode", targetId: userId, ipAddress: req.ip });
    return res.json({ success: true, message: "Impersonation started", user: (response?.user as Record<string, unknown>) || null });
  } catch (error: unknown) {
    logger.error("Impersonation verification failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Impersonation failed" });
  }
});

export { router as impersonateRoutes };
