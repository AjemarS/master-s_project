import { Router, Request, Response } from "express";
import { pool } from "../auth";
import logger from "../logger";

const router = Router();

interface UserRow {
  id: string;
  name: string;
  email: string;
}

router.get("/api/internal/users", async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    let query = `SELECT id, name, email FROM "user"`;
    const params: string[] = [];
    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }
    query += ` ORDER BY name ASC`;
    const { rows } = await pool.query<UserRow>(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error("Internal: Failed to list users", { error: (err as Error).message });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/api/internal/users/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, name, email FROM "user" WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error("Internal: Failed to get user by id", { error: (err as Error).message, userId: req.params.id });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/api/internal/users/email/:email", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, name, email FROM "user" WHERE email = $1`,
      [req.params.email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error("Internal: Failed to get user by email", { error: (err as Error).message, email: req.params.email });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/api/internal/users/batch", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, data: {} });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM "user" WHERE id IN (${placeholders})`,
      ids
    );
    const map: Record<string, string> = {};
    for (const u of rows) {
      map[u.id] = u.email;
    }
    return res.json({ success: true, data: map });
  } catch (err) {
    logger.error("Internal: Failed batch email lookup", { error: (err as Error).message });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export { router as internalRoutes };
