// usersController.ts
import { fromNodeHeaders } from "better-auth/node";
import * as usersService from "../services/usersService";
import logger from "../logger";
import { Request, Response } from "express";

export const usersController = {
  // GET /admin/users
  async getUsers(req: Request, res: Response) {
    try {
      const query = req.query;
      const headers = fromNodeHeaders(req.headers);

      const users = await usersService.getUsers(query, headers);

      return res.status(200).json({
        success: true,
        count: users.total ?? 0,
        users: users,
      });
    } catch (error: any) {
      logger.error("Get users failed", { error: (error as Error).message });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch users",
      });
    }
  },

  // GET /admin/users/:id
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await usersService.getUserById(id);

      return res.status(200).json({
        success: true,
        user: user,
      });
    } catch (error: any) {
      logger.error("Get user by ID failed", { error: (error as Error).message, userId: req.params.id });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch user",
      });
    }
  },

  // POST /admin/users
  async createUser(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: "email, password and name are required",
        });
      }

      const user = await usersService.createUser(email, password, name);

      return res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      logger.error("Create user failed", { error: (error as Error).message });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to create user",
      });
    }
  },

  // PUT /admin/users/:id
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const updated = await usersService.updateUser(id, data);

      return res.status(200).json({
        success: true,
        updated,
      });
    } catch (error: any) {
      logger.error("Update user failed", { error: (error as Error).message, userId: req.params.id });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to update user",
      });
    }
  },

  // DELETE /admin/users/:id
  async removeUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await usersService.removeUser(id);

      return res.status(200).json({
        success: true,
        result,
      });
    } catch (error: any) {
      logger.error("Remove user failed", { error: (error as Error).message, userId: req.params.id });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to delete user",
      });
    }
  },

  // GET /admin/users/:id/sessions
  async getUserSessions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sessions = await usersService.getUserSessions(id);

      return res.status(200).json({
        success: true,
        sessions,
      });
    } catch (error: any) {
      logger.error("Get user sessions failed", { error: (error as Error).message, userId: req.params.id });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch sessions",
      });
    }
  },

  // POST /admin/set-role
  async setUserRole(req: Request, res: Response) {
    try {
      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          message: "userId and role are required",
        });
      }

      const response = await usersService.setUserRole(userId, role, fromNodeHeaders(req.headers));

      return res.status(200).json({
        success: true,
        response,
      });
    } catch (error: any) {
      logger.error("Set user role failed", { error: (error as Error).message, userId: req.body.userId });
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to set user role",
      });
    }
  },
};
