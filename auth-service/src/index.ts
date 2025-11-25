import express from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import cors from "cors";
import { auth } from "./auth";
import dotenv from "dotenv";

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

// Better Auth routes - всі маршрути автентифікації
app.all("/auth/*", toNodeHandler(auth));

// Захищений endpoint для перевірки сесії

app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

app.all("/", async (req, res) => {
  res.redirect("http://localhost/");
});
// // Список користувачів (для адміністрування)
// app.get("/api/users", async (req, res) => {
//   try {
//     const session = await auth.api.getSession({
//       headers: req.headers as any,
//     });

//     if (!session || session.user.role !== "admin") {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Тут можна додати перевірку ролей
//     // У Better Auth можна отримати користувачів через database adapter
//     res.json({ message: "Users endpoint - implement as needed" });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
  console.log(`📍 Auth endpoint: http://localhost:${PORT}`);
});
