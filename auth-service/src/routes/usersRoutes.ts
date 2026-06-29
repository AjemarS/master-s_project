import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema, setRoleSchema } from "../validation/schemas";
import { writeAuditLog } from "../middleware/auditLog";
import logger from "../logger";

const router = express.Router();

function audit(action: string, target: string, req: express.Request, res: express.Response) {
  const actor = res.locals.user?.id || "unknown";
  const actorEmail = res.locals.user?.email as string | undefined;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  writeAuditLog({ actorId: actor, actorEmail, action, targetId: target, ipAddress: ip });
}

function logError(err: unknown, message: string, meta?: Record<string, unknown>) {
  logger.error(message, { error: (err as Error).message, ...meta });
}

router.get("/users", async (req, res) => {
  try {
    const query = req.query;
    const headers = fromNodeHeaders(req.headers);
    const users = await auth.api.listUsers({
      query: {
        searchValue: query.search as string | undefined,
        limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
        offset: query.offset ? parseInt(query.offset as string, 10) : undefined,
      },
      headers,
    });
    return res.status(200).json({ success: true, count: users.total ?? 0, users });
  } catch (error: unknown) {
    logError(error, "Get users failed");
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await auth.api.getUser({ query: { id } });
    return res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    logError(error, "Get user by ID failed", { userId: req.params.id });
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to fetch user" });
  }
});

router.post("/users", validate(createUserSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = await auth.api.createUser({
      body: { email, password, name, role: "user", data: { status: "active" } },
    });
    audit("createUser", user?.user?.id || "unknown", req, res);
    return res.status(201).json({ success: true, user });
  } catch (error: unknown) {
    logError(error, "Create user failed");
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to create user" });
  }
});

router.put("/users/:id", validate(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await auth.api.adminUpdateUser({ body: { userId: id, data } });
    audit("updateUser", id, req, res);
    return res.status(200).json({ success: true, updated });
  } catch (error: unknown) {
    logError(error, "Update user failed", { userId: req.params.id });
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await auth.api.removeUser({ body: { userId: id } });
    audit("removeUser", id, req, res);
    return res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    logError(error, "Remove user failed", { userId: req.params.id });
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to delete user" });
  }
});

router.get("/users/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await auth.api.listUserSessions({ body: { userId: id } });
    return res.status(200).json({ success: true, sessions });
  } catch (error: unknown) {
    logError(error, "Get user sessions failed", { userId: req.params.id });
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to fetch sessions" });
  }
});

router.post("/set-role", validate(setRoleSchema), async (req, res) => {
  try {
    const { userId, role } = req.body;
    const response = await auth.api.setRole({
      body: { userId, role },
      headers: fromNodeHeaders(req.headers),
    });
    audit("setRole", userId, req, res);
    return res.status(200).json({ success: true, response });
  } catch (error: unknown) {
    logError(error, "Set user role failed", { userId: req.body.userId });
    return res.status(500).json({ success: false, message: (error as Error).message || "Failed to set user role" });
  }
});

export { router as usersRoutes };
