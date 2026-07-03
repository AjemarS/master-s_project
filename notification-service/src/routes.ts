import { Router, Request, Response, NextFunction } from "express";
import logger from "./logger";
import * as notifDb from "./notifications";
import * as prefsDb from "./preferences";
import * as sse from "./sse";
import { rateLimit } from "./rate-limiter";
import { htmlWrap, sendEmail } from "./templates";
import { getHealthStatus } from "./consumer";

export function requireOwnUserId(req: Request, res: Response, next: NextFunction): void {
  const gatewayUserId = req.headers["x-gateway-user-id"] as string | undefined;
  const gatewayRole = req.headers["x-gateway-user-role"] as string | undefined;
  const targetUserId = (req.query.userId as string) || (req.params.userId as string);

  if (!targetUserId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  if (gatewayRole === "admin") { next(); return; }
  if (gatewayUserId && gatewayUserId === targetUserId) { next(); return; }
  res.status(403).json({ error: "Access denied" });
}

export function requireGatewayId(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers["x-gateway-user-id"]) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  next();
}

const router = Router();

router.get("/health", (req: Request, res: Response) => {
  const { connected } = getHealthStatus();
  res.json({
    status: connected ? "healthy" : "degraded",
    service: "notification-service",
    consumer: connected ? "connected" : "disconnected",
    sseClients: sse.getClientCount(),
  });
});

router.get("/api/notifications", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    const { userId, page, limit } = req.query;
    const result = await notifDb.listNotifications(userId as string, {
      page: parseInt(page as string) || 1,
      limit: Math.min(parseInt(limit as string) || 20, 100),
    });
    res.json(result);
  } catch (err) {
    logger.error("GET /api/notifications failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/notifications/unread/:userId", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    const count = await notifDb.getUnreadCount(req.params.userId);
    res.json({ count });
  } catch (err) {
    logger.error("GET /api/notifications/unread failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/notifications/:id/read", requireGatewayId, async (req: Request, res: Response) => {
  try {
    const gatewayUserId = req.headers["x-gateway-user-id"] as string | undefined;
    const notif = await notifDb.markRead(req.params.id, gatewayUserId);
    if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json(notif);
  } catch (err) {
    logger.error("PATCH /api/notifications/:id/read failed", { error: (err as Error).message, id: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/notifications/read-all/:userId", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    await notifDb.markAllRead(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    logger.error("PATCH /api/notifications/read-all failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/notifications/:id/dismiss", requireGatewayId, async (req: Request, res: Response) => {
  try {
    const gatewayUserId = req.headers["x-gateway-user-id"] as string | undefined;
    const notif = await notifDb.dismiss(req.params.id, gatewayUserId);
    if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json(notif);
  } catch (err) {
    logger.error("POST /api/notifications/:id/dismiss failed", { error: (err as Error).message, id: req.params.id });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/notifications/:userId", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    await notifDb.clearAll(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/notifications/:userId failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/notifications/preferences/:userId", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    const prefs = await prefsDb.getPreferences(req.params.userId);
    res.json(prefs);
  } catch (err) {
    logger.error("GET /api/notifications/preferences failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/notifications/preferences/:userId", requireOwnUserId, async (req: Request, res: Response) => {
  try {
    const prefs = await prefsDb.setPreferences(req.params.userId, req.body);
    res.json(prefs);
  } catch (err) {
    logger.error("PATCH /api/notifications/preferences failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/notifications/stream", requireOwnUserId, (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
  }, 30000);

  sse.addClient(userId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

const MARKETING_ALLOWED_TYPES = ["marketing", "offer", "promotion"];

router.post("/api/notifications/marketing", rateLimit({ max: 5, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const role = req.headers["x-gateway-user-role"] as string | undefined;
    if (role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const { title, description, type } = req.body;
    if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
    const notifType = MARKETING_ALLOWED_TYPES.includes(type) ? type : "marketing";

    const users = await prefsDb.getMarketingTargets(1000);

    const tasks: Promise<unknown>[] = [];
    for (const u of users) {
      if (u.marketing_in_app) {
        tasks.push(
          notifDb.createNotification({
            userId: u.user_id,
            type: notifType,
            title,
            description,
            channel: "in_app",
            metadata: {},
          })
        );
      }
      if (u.marketing_email && u.email) {
        const htmlBody = htmlWrap(`<p>${description}</p>`, title);
        tasks.push(sendEmail(u.email, title, htmlBody));
      }
    }

    const results = await Promise.allSettled(tasks);
    const created = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      logger.error("Marketing push partial failure", { failed: failed.length, total: tasks.length });
    }
    res.json({ success: true, created, total: tasks.length });
  } catch (err) {
    logger.error("POST /api/notifications/marketing failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
