import { Router, Request, Response } from "express";
import { pool } from "../auth";
import { redisClient } from "../middleware/rateLimiter";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await pool.query("SELECT 1");
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  try {
    if (redisClient.status === "ready") {
      await redisClient.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "disconnected";
      healthy = false;
    }
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    service: "auth-service",
    checks,
    uptime: process.uptime(),
  });
});

export { router as healthRoutes };
