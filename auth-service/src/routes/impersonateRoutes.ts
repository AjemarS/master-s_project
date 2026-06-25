import { Router, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, pool } from "../auth";
import { requireAdmin } from "../middleware/authMiddleware";
import { redisClient } from "../middleware/rateLimiter";
import { sendImpersonationCode } from "../email/sender";
import logger from "../logger";

const router = Router();

// Fallback in-memory store for when Redis is unavailable
const memoryStore = new Map<string, { code: string; expiresAt: Date }>();
let redisAvailable = true;

setInterval(() => {
  const now = new Date();
  for (const [email, entry] of memoryStore) {
    if (entry.expiresAt < now) memoryStore.delete(email);
  }
}, 300_000);

async function storeCode(email: string, code: string): Promise<void> {
  const ttl = 300; // 5 minutes
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

function forwardSetCookie(response: any, res: Response): void {
  if (!response?.headers) return;
  for (const [key, value] of Object.entries(response.headers)) {
    if (key.toLowerCase() === "set-cookie") {
      if (Array.isArray(value)) {
        res.setHeader("Set-Cookie", value);
      } else {
        res.setHeader("Set-Cookie", value as string);
      }
    }
  }
}

/**
 * POST /auth/admin/stop-impersonation
 * Stop impersonation and restore original session.
 * Works for both admin and cashier — Better Auth handles session restoration.
 */
router.post("/admin/stop-impersonation", async (req: Request, res: Response) => {
  try {
    const response = await auth.api.stopImpersonating({
      headers: fromNodeHeaders(req.headers),
    }) as any;

    forwardSetCookie(response, res);
    logger.info("Impersonation stopped");
    return res.json({ message: "Impersonation stopped" });
  } catch (error: any) {
    logger.error("Stop impersonation failed", { error: error.message });
    return res.status(500).json({ message: "Failed to stop impersonation" });
  }
});

/**
 * POST /auth/admin/impersonate
 * Admin can impersonate any user.
 */
router.post("/admin/impersonate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const adminSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!adminSession) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userResult = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const response = await auth.api.impersonateUser({
      headers: fromNodeHeaders(req.headers),
      body: { userId },
    }) as any;

    forwardSetCookie(response, res);
    logger.info("Impersonation started", { actorId: adminSession.user.id, targetId: userId });
    return res.json({ message: "Impersonation started", user: response.user || null });
  } catch (error: any) {
    logger.error("Impersonation failed", { error: error.message });
    return res.status(500).json({ message: "Impersonation failed", error: error.message });
  }
});

/**
 * POST /auth/impersonate/request-code
 * Cashier requests a one-time impersonation code sent to the user's email.
 */
router.post("/impersonate/request-code", async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ message: "userEmail is required" });
    }

    const userResult = await pool.query(
      'SELECT id, name, email FROM "user" WHERE email = $1',
      [userEmail]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit code and store (Redis with in-memory fallback)
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await storeCode(userEmail, code);

    await sendImpersonationCode(userEmail, code);
    // Dev fallback: log code to console if email sending skipped
    console.log(`[dev] Impersonation code for ${userEmail}: ${code}`);
    res.json({ message: "Код надіслано на email", email: userEmail });

  } catch (error: any) {
    logger.error("Failed to request impersonation code", { error: error.message });
    return res.status(500).json({ message: "Failed to send code" });
  }
});

/**
 * POST /auth/impersonate/verify-code
 * Verify the code and start impersonation.
 */
router.post("/impersonate/verify-code", async (req: Request, res: Response) => {
  try {
    const { userEmail, code } = req.body;
    if (!userEmail || !code) {
      return res.status(400).json({ message: "userEmail and code are required" });
    }

    const storedCode = await getCode(userEmail);
    if (!storedCode) {
      return res.status(400).json({ message: "No code requested or code expired" });
    }

    if (storedCode !== code) {
      return res.status(400).json({ message: "Invalid code" });
    }

    const userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = userResult.rows[0].id;
    await deleteCode(userEmail);

    const response = await auth.api.impersonateUser({
      headers: fromNodeHeaders(req.headers),
      body: { userId },
    }) as any;

    forwardSetCookie(response, res);
    logger.info("Cashier impersonation verified", { targetId: userId });
    return res.json({ message: "Impersonation started", user: response.user || null });
  } catch (error: any) {
    logger.error("Impersonation verification failed", { error: error.message });
    return res.status(500).json({ message: "Impersonation failed" });
  }
});

export { router as impersonateRoutes };
