import express, { NextFunction, Request, Response } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import cors from "cors";
import { auth } from "./auth";
import dotenv from "dotenv";
import { twoFactorRoutes } from "./routes/twoFactorRoutes";
import { usersRoutes } from "./routes/usersRoutes";

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

    // Attach user to request if needed, though express types might complain
    // (req as any).user = session.user;
    
    next();
  } catch (error) {
    console.error("Admin check failed", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Захищений endpoint для перевірки сесії
app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

// Better Auth routes - всі маршрути автентифікації
app.all("/auth/*", toNodeHandler(auth));

app.all("/", async (req, res) => {
  res.redirect("http://localhost/");
});

app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
  console.log(`📍 Auth endpoint: http://localhost:${PORT}`);
});
