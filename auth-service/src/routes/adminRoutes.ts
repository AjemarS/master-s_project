import { Router, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, pool } from "../auth";
import { adminRateLimit } from "../middleware/rateLimiter";
import { getSessionFromCacheOrProvider, invalidateSessionCache } from "../middleware/sessionCache";
import { writeAuditLog } from "../middleware/auditLog";
import { auditLogQuerySchema } from "../validation/querySchemas";
import logger from "../logger";

const router = Router();

router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const parsed = auditLogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid query params", errors: parsed.error.flatten().fieldErrors });
    }
    const { action, actorId, limit, offset } = parsed.data;

    const params: unknown[] = [];
    let clause = "";
    let paramIdx = 0;

    if (action) { paramIdx++; params.push(action); clause += ` AND action = $${paramIdx}`; }
    if (actorId) { paramIdx++; params.push(actorId); clause += ` AND actor_id = $${paramIdx}`; }

    const rows = await pool.query(
      `SELECT * FROM audit_log WHERE 1=1${clause} ORDER BY created_at DESC LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
      [...params, limit, offset],
    );

    const total = await pool.query(`SELECT COUNT(*) FROM audit_log WHERE 1=1${clause}`, params);

    return res.json({
      success: true,
      logs: rows.rows,
      total: parseInt(total.rows[0].count, 10),
    });
  } catch (error: unknown) {
    logger.error("Failed to fetch audit logs", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
});

router.post("/audit-logs", adminRateLimit, async (req: Request, res: Response) => {
  try {
    const { action, actorId, targetId, ipAddress } = req.body as Record<string, string | undefined>;
    if (!action || !actorId) {
      return res.status(400).json({ success: false, message: "action and actorId required" });
    }
    await writeAuditLog({
      actorId,
      action,
      targetId,
      ipAddress: ipAddress || req.ip || req.socket.remoteAddress || "unknown",
    });
    return res.json({ success: true, message: "Audit log entry created" });
  } catch (error: unknown) {
    logger.error("Failed to write audit log", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to write audit log" });
  }
});

router.post("/sessions/revoke", adminRateLimit, async (req: Request, res: Response) => {
  try {
    const { sessionToken, userId } = req.body;

    if (sessionToken) {
      await auth.api.revokeSession({ body: { token: sessionToken }, headers: fromNodeHeaders(req.headers) });
      invalidateSessionCache(sessionToken);
    } else if (userId) {
      const sessionsResult = await auth.api.listUserSessions({ body: { userId } });
      const tokens = sessionsResult.sessions.map((s: { token: string }) => s.token);
      await Promise.all(tokens.map((token: string) =>
        auth.api.revokeSession({ body: { token }, headers: fromNodeHeaders(req.headers) })
      ));
      await Promise.all(tokens.map((token: string) => invalidateSessionCache(token)));
    } else {
      return res.status(400).json({ success: false, message: "sessionToken or userId required" });
    }

    const actor = res.locals.user?.id || "unknown";
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    writeAuditLog({ actorId: actor, action: "revokeSession", targetId: userId || sessionToken, ipAddress: ip });
    return res.json({ success: true, message: "Sessions revoked" });
  } catch (error: unknown) {
    logger.error("Admin revoke session failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to revoke sessions" });
  }
});

export { router as adminRoutes };
