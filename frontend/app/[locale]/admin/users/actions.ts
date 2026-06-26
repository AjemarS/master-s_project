import { authClient } from "~/lib/auth-client";

export const adminService = {
  /** List all users */
  async listUsers(query: Parameters<typeof authClient.admin.listUsers>[0]["query"]) {
    return await authClient.admin.listUsers({ query });
  },

  /** Ban a user */
  async banUser(userId: string, reason?: string) {
    return await authClient.admin.banUser({ userId, banReason: reason });
  },

  /** Unban a user */
  async unbanUser(userId: string) {
    return await authClient.admin.unbanUser({ userId });
  },

  /** Set a user's role */
  async setUserRole(userId: string, role: "user" | "admin" | "cashier" | "warehouse_worker") {
    return await authClient.admin.setRole({
      userId,
      // Custom roles (cashier, warehouse_worker) are configured server-side.
      // Better Auth admin plugin types only include default roles,
      // so we assert the narrower type. Runtime value is preserved.
      role: role as "admin" | "user",
    });
  },

  /** Delete a user */
  async removeUser(userId: string) {
    return await authClient.admin.removeUser({ userId });
  },

  /** Create a user */
  async createUser(user: { email: string; password: string; name: string; role?: "admin" | "user" | "cashier" | "warehouse_worker" }) {
    return await authClient.admin.createUser({
      ...user,
      role: user.role as "admin" | "user" | undefined,
    });
  },

  /** Update a user's fields */
  async updateUser(userId: string, data: Record<string, unknown>) {
    return await authClient.admin.updateUser({ userId, data });
  },
};
