import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema, setRoleSchema } from "../validation/schemas";
import logger from "../logger";

const router = express.Router();

function audit(action: string, target: string, req: express.Request, res: express.Response) {
  const actor = res.locals.user?.id || "unknown";
  logger.info("Admin action", { actor, action, target, ip: req.ip });
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
  } catch (error: any) {
    logger.error("Get users failed", { error: error.message });
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await auth.api.getUser({ query: { id } });
    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    logger.error("Get user by ID failed", { error: error.message, userId: req.params.id });
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch user" });
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
  } catch (error: any) {
    logger.error("Create user failed", { error: error.message });
    return res.status(500).json({ success: false, message: error.message || "Failed to create user" });
  }
});

router.put("/users/:id", validate(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await auth.api.adminUpdateUser({ body: { userId: id, data } });
    audit("updateUser", id, req, res);
    return res.status(200).json({ success: true, updated });
  } catch (error: any) {
    logger.error("Update user failed", { error: error.message, userId: req.params.id });
    return res.status(500).json({ success: false, message: error.message || "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await auth.api.removeUser({ body: { userId: id } });
    audit("removeUser", id, req, res);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    logger.error("Remove user failed", { error: error.message, userId: req.params.id });
    return res.status(500).json({ success: false, message: error.message || "Failed to delete user" });
  }
});

router.get("/users/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await auth.api.listUserSessions({ body: { userId: id } });
    return res.status(200).json({ success: true, sessions });
  } catch (error: any) {
    logger.error("Get user sessions failed", { error: error.message, userId: req.params.id });
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch sessions" });
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
  } catch (error: any) {
    logger.error("Set user role failed", { error: error.message, userId: req.body.userId });
    return res.status(500).json({ success: false, message: error.message || "Failed to set user role" });
  }
});

export { router as usersRoutes };
