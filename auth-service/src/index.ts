import express, { NextFunction, Request, Response } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import cors from "cors";
import { auth } from "./auth";
import logger from "./logger";
import dotenv from "dotenv";
import { twoFactorRoutes } from "./routes/twoFactorRoutes";
import { usersRoutes } from "./routes/usersRoutes";
import {
  checkLoginRateLimit,
  recordFailedAttempt,
  resetLoginRateLimit,
  initRateLimiter,
} from "./middleware/rateLimiter";
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

// Middleware
app.use(
  cors({
    origin: ["http://localhost", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "auth-service" });
});

// Brute-force protection: intercept all sign-in related routes
app.use("/auth/sign-in/email", async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  logger.debug(`Rate limit check for ${req.method} ${req.path}`, { ip });

  // Check rate limit before allowing the request (with error handling)
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
    allowed = false;  // Fail-closed: block if Redis is unavailable
    retryAfter = 30;  // 30-second back-off
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

  // Track the response body to detect success/failure
  let responseBody: any = undefined;

  onFinished(res, () => {
    if (!responseBody) return;

    if (responseBody?.code) {
      recordFailedAttempt(ip).catch(() => {});
    } else if (responseBody?.token || responseBody?.user) {
      resetLoginRateLimit(ip).catch(() => {});
    }
  });

  // Intercept res.json to capture the body for onFinished
  const originalJson = res.json.bind(res);
  res.json = function (this: Response, body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  } as typeof res.json;

  next();
});

app.use("/auth/two-factor", twoFactorRoutes);

app.use("/auth/admin", requireAdmin, usersRoutes);

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user || session.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    next();
  } catch (error) {
    logger.error("Admin check failed", { error: (error as Error).message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

app.all("/auth/*", (req: Request, res: Response, next: NextFunction) => {
  const handler = toNodeHandler(auth);
  handler(req, res).catch((err: unknown) => {
    logger.error("Auth handler error", { error: (err as Error).message, path: req.path, method: req.method, body: req.body });
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error", code: "AUTH_HANDLER_ERROR" });
    }
  });
});

// Global error handler (must have 4 parameters)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled Express error", { error: err.message, stack: err.stack });
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.all("/", async (req, res) => {
  res.redirect("http://localhost/");
});

// Initialize rate limiter before starting server
initRateLimiter()
  .then(() => logger.info("Rate limiter initialized (Redis)"))
  .catch((err) =>
    logger.warn("Rate limiter unavailable, running without brute-force protection", {
      error: err.message,
    })
  );

app.listen(PORT, () => {
  logger.info("Auth service running", { port: PORT });
  const providers = [
    process.env.GOOGLE_CLIENT_ID ? "Google" : null,
    process.env.GITHUB_CLIENT_ID ? "GitHub" : null,
  ].filter(Boolean);
  if (providers.length > 0) {
    logger.info("OAuth providers configured", { providers });
  }
});