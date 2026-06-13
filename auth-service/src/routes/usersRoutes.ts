// usersRoutes.ts
import express from "express";
import { usersController } from "../controllers/usersController";
const router = express.Router();

// Get all users (admin only)
router.get("/users", async (req, res) => {
  await usersController.getUsers(req, res);
});

// CRUD operations for user
router.get("/users/:id", async (req, res) => {
  await usersController.getUserById(req, res);
});

router.post("/users", async (req, res) => {
  await usersController.createUser(req, res);
});

router.put("/users/:id", async (req, res) => {
  await usersController.updateUser(req, res);
});

router.delete("/users/:id", async (req, res) => {
  await usersController.removeUser(req, res);
});

// Users sessions
router.get("/users/:id/sessions", async (req, res) => {
  await usersController.getUserSessions(req, res);
});

// Set user role
router.post("/set-role", async (req, res) => {
  await usersController.setUserRole(req, res);
});

export { router as usersRoutes };
