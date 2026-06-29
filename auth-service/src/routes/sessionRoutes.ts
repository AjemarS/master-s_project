import { Router, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { getSessionFromCacheOrProvider, invalidateSessionCache } from "../middleware/sessionCache";
import { requireAuth } from "../middleware/authMiddleware";
import logger from "../logger";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  const session = await getSessionFromCacheOrProvider(req.headers);
  if (session?.user) {
    const user = session.user as Record<string, unknown>;
    if (user.id) res.setHeader("X-User-Id", String(user.id));
    res.setHeader("X-User-Role", String(user.role ?? "user"));
    if (user.email) res.setHeader("X-User-Email", String(user.email));
    if (user.name) res.setHeader("X-User-Name", String(user.name));
  }
  return res.json(session);
});

router.get("/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = await getSessionFromCacheOrProvider(req.headers);
    if (!session) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const sessions = await auth.api.listUserSessions({ body: { userId: session.user.id } });
    return res.json({ success: true, sessions: sessions.sessions });
  } catch (error: unknown) {
    logger.error("List sessions failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to list sessions" });
  }
});

router.post("/sessions/revoke", async (req: Request, res: Response) => {
  try {
    const session = await getSessionFromCacheOrProvider(req.headers);
    if (!session) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    await auth.api.revokeSession({
      body: { token: session.session.token },
      headers: fromNodeHeaders(req.headers),
    });
    invalidateSessionCache(session.session.token);
    return res.json({ success: true, message: "Session revoked" });
  } catch (error: unknown) {
    logger.error("Revoke session failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Failed to revoke session" });
  }
});

export { router as sessionRoutes };
