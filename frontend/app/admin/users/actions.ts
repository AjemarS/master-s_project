import { authClient } from "~/lib/auth-client";

export const adminService = {
  /** List all users */
  async listUsers(query: Parameters<typeof authClient.admin.listUsers>[0]["query"]) {
    return await authClient.admin.listUsers({ query });
  },

  /** Ban a user */
  async banUser(userId: string, reason?: string) {
    const payload = {
      userId,
      reason,
    };

    return await authClient.admin.banUser(payload);
  },

  /** Unban a user */
  async unbanUser(userId: string) {
    const payload = {
      userId,
    };

    return await authClient.admin.unbanUser(payload);
  },

  /** Set a user's role */
  async setUserRole(userId: string, role: "user" | "admin" | "cashier" | "warehouse_worker") {
    const payload = {
      userId,
      role,
    };

    return await authClient.admin.setRole(payload);
  },

  /** Delete a user */
  async removeUser(userId: string) {
    const payload = {
      userId,
    };

    return await authClient.admin.removeUser(payload);
  },

  /** Create a user */
  async createUser(user: { email: string; password: string; name: string; role?: "admin" | "user" | "cashier" | "warehouse_worker" }) {
    return await authClient.admin.createUser(user);
  },

  /** Update a user's fields */
  async updateUser(userId: string, data: Record<string, unknown>) {
    return await authClient.admin.updateUser({ userId, data });
  },
};
