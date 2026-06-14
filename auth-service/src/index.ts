import express, { NextFunction, Request, Response } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import cors from "cors";
import { auth } from "./auth";
import dotenv from "dotenv";
import { twoFactorRoutes } from "./routes/twoFactorRoutes";
import { usersRoutes } from "./routes/usersRoutes";
import {
  checkLoginRateLimit,
  recordFailedAttempt,
  resetLoginRateLimit,
} from "./middleware/rateLimiter";

dotenv.config();

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
// This middleware runs before BetterAuth's handler gets the request
app.use("/auth/sign-in", (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // Check rate limit before allowing the request
  const { allowed, retryAfter } = checkLoginRateLimit(ip);

  if (!allowed) {
    return res.status(429).json({
      error: {
        message: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        status: 429,
      },
    });
  }

  // Override res.end to intercept the response from BetterAuth
  const originalEnd = res.end.bind(res);
  const originalJson = res.json.bind(res);

  res.end = function (this: Response, chunk?: any) {
    // Try to parse response body to check for error
    if (chunk) {
      try {
        const parsed = JSON.parse(chunk.toString());
        if (parsed?.error) {
          recordFailedAttempt(ip);
        } else {
          resetLoginRateLimit(ip);
        }
      } catch {
        // Not JSON, ignore
      }
    }
    return originalEnd.call(this, chunk as Parameters<Response["end"]>[0]);
  } as typeof res.end;

  // Also intercept json in case BetterAuth uses it
  res.json = function (this: Response, body: any) {
    if (body?.error) {
      recordFailedAttempt(ip);
    } else {
      resetLoginRateLimit(ip);
    }
    return originalJson.call(this, body as Parameters<Response["json"]>[0]);
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
    console.error("Admin check failed", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Protected endpoint for session verification
app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

// Better Auth routes - all authentication routes
app.all("/auth/*", toNodeHandler(auth));

app.all("/", async (req, res) => {
  res.redirect("http://localhost/");
});

app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
  console.log(`📍 Auth endpoint: http://localhost:${PORT}`);
});