import { authClient } from "~/lib/auth-client";

export const adminService = {
  /** Отримати список користувачів */
  async listUsers(query: Parameters<typeof authClient.admin.listUsers>[0]["query"]) {
    return await authClient.admin.listUsers({ query });
  },

  /** Забанити користувача */
  async banUser(userId: string, reason?: string) {
    const payload = {
      userId,
      reason,
    };

    return await authClient.admin.banUser(payload);
  },

  /** Розбанити користувача */
  async unbanUser(userId: string) {
    const payload = {
      userId,
    };

    return await authClient.admin.unbanUser(payload);
  },

  /** Встановити роль користувачу */
  async setUserRole(userId: string, role: "user" | "admin") {
    const payload = {
      userId,
      role,
    };

    return await authClient.admin.setRole(payload);
  },

  // /** Видалити користувача */
  // async removeUser(userId: string) {
  //   const payload = {
  //     userId,
  //   };

  //   return await authClient.admin.removeUser(payload);
  // },
};
