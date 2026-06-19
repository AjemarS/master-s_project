import express, { NextFunction, Request, Response } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import cors from "cors";
import crypto from "crypto";
import { auth, pool } from "./auth";
import logger from "./logger";
import dotenv from "dotenv";
import { twoFactorRoutes } from "./routes/twoFactorRoutes";
import { usersRoutes } from "./routes/usersRoutes";
import {
  checkLoginRateLimit,
  recordFailedAttempt,
  resetLoginRateLimit,
  initRateLimiter,
  redisClient,
} from "./middleware/rateLimiter";
import { requireAdmin, addAdminUserId, getAdminUserIds } from "./middleware/authMiddleware";
import { hashPassword } from "better-auth/crypto";
import onFinished from "on-finished";

dotenv.config();

// --- Environment variable validation ---
const requiredEnvVars = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

const optionalEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "FRONTEND_URL",
] as const;

function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ""
  );
  if (missing.length > 0) {
    logger.error("FATAL: Missing required environment variables", { missing });
    process.exit(1);
  }

  const missingOptional = optionalEnvVars.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ""
  );
  if (missingOptional.length > 0) {
    logger.warn("Optional environment variables not set", { missing: missingOptional });
  }
}

validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS origins from config
const corsOrigins = (() => {
  const origins = ["http://localhost", "http://localhost:3000"];
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !origins.includes(frontendUrl)) {
    origins.push(frontendUrl);
  }
  return origins;
})();

// --- Global middleware ---
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Request tracing: X-Request-Id
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// CSRF protection via Origin/Referer header check
app.use((req: Request, res: Response, next: NextFunction) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers["origin"] as string | undefined;
    const referer = req.headers["referer"] as string | undefined;
    const allowed = corsOrigins.some(
      (o) => origin === o || referer?.startsWith(o + "/") || referer === o + "/"
    );
    if (!allowed) {
      return res.status(403).json({ message: "CSRF check failed" });
    }
  }
  next();
});

// Health check with DB and Redis probes
app.get("/health", async (req: Request, res: Response) => {
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

// Brute-force protection for sign-in
app.use("/auth/sign-in/email", async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  let allowed: boolean;
  let retryAfter: number | undefined;
  let redisDown = false;
  try {
    const result = await checkLoginRateLimit(ip);
    allowed = result.allowed;
    retryAfter = result.retryAfter;
  } catch (err) {
    logger.error("Rate limit check failed — blocking request as safety measure", {
      error: (err as Error).message,
      ip,
    });
    allowed = false;
    retryAfter = 30;
    redisDown = true;
  }

  if (!allowed) {
    return res.status(429).json({
      error: {
        message: redisDown
          ? "Service temporarily unavailable. Please try again shortly."
          : `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        status: 429,
      },
    });
  }

  onFinished(res, () => {
    if (res.statusCode === 200) {
      resetLoginRateLimit(ip).catch(() => {});
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      recordFailedAttempt(ip).catch(() => {});
    }
  });

  next();
});

app.use("/auth/two-factor", twoFactorRoutes);

app.use("/auth/admin", requireAdmin, usersRoutes);

// Session revocation (own session)
app.post("/auth/sessions/revoke", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    await auth.api.revokeSession({
      body: { token: session.session.token },
      headers: fromNodeHeaders(req.headers),
    });
    return res.json({ message: "Session revoked" });
  } catch (error: any) {
    logger.error("Revoke session failed", { error: error.message });
    return res.status(500).json({ message: "Failed to revoke session" });
  }
});

// Session revocation (admin)
app.post("/auth/admin/sessions/revoke", requireAdmin, async (req, res) => {
  try {
    const { sessionToken, userId } = req.body;
    if (sessionToken) {
      await auth.api.revokeSession({
        body: { token: sessionToken },
        headers: fromNodeHeaders(req.headers),
      });
    } else if (userId) {
      const sessionsResult = await auth.api.listUserSessions({ body: { userId } });
      await Promise.all(
        sessionsResult.sessions.map((s: any) =>
          auth.api.revokeSession({
            body: { token: s.token },
            headers: fromNodeHeaders(req.headers),
          })
        )
      );
    } else {
      return res.status(400).json({ message: "sessionToken or userId required" });
    }
    logger.info("Admin revoked session", { actor: res.locals.user?.id, target: userId || sessionToken });
    return res.json({ message: "Sessions revoked" });
  } catch (error: any) {
    logger.error("Admin revoke session failed", { error: error.message });
    return res.status(500).json({ message: "Failed to revoke sessions" });
  }
});

app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

app.all("/auth/*", (req: Request, res: Response, _next: NextFunction) => {
  const handler = toNodeHandler(auth);
  handler(req, res).catch((err: unknown) => {
    logger.error("Auth handler error", { error: (err as Error).message, path: req.path, method: req.method });
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error", code: "AUTH_HANDLER_ERROR" });
    }
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled Express error", { error: err.message, stack: err.stack });
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.all("/", async (_req: Request, res: Response) => {
  res.redirect("http://localhost/");
});

// Seed admin user on first startup
async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) return;

  if (getAdminUserIds().length > 0) {
    logger.debug("ADMIN_USER_IDS already configured, skipping seed");
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [adminEmail]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      addAdminUserId(userId);
      logger.info("Existing user promoted to admin", { userId, email: adminEmail });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(adminPassword);

    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [userId, adminName, adminEmail, true, "admin", "active"]
    );

    await pool.query(
      `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [crypto.randomUUID(), userId, "credential", userId, passwordHash]
    );

    addAdminUserId(userId);
    logger.info("Admin user created", { userId, email: adminEmail, name: adminName });
    logger.warn(
      `Add userId "${userId}" to ADMIN_USER_IDS in .env to retain admin access on restart.`
    );
  } catch (error: any) {
    logger.warn("Failed to seed admin user", { error: error.message });
  }
}

// Initialize rate limiter
initRateLimiter()
  .then(() => logger.info("Rate limiter initialized (Redis)"))
  .catch((err) =>
    logger.warn("Rate limiter unavailable, running without brute-force protection", {
      error: err.message,
    })
  );

// Seed admin and start server
let server: ReturnType<typeof app.listen>;

seedAdminUser().finally(() => {
  server = app.listen(PORT, () => {
    logger.info("Auth service running", { port: PORT });
    const providers = [
      process.env.GOOGLE_CLIENT_ID ? "Google" : null,
      process.env.GITHUB_CLIENT_ID ? "GitHub" : null,
    ].filter(Boolean);
    if (providers.length > 0) {
      logger.info("OAuth providers configured", { providers });
    }
  });
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await pool.end();
      logger.info("Database pool closed");
    } catch (err) {
      logger.error("Error closing database pool", { error: (err as Error).message });
    }
    try {
      redisClient.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.error("Error closing Redis", { error: (err as Error).message });
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
