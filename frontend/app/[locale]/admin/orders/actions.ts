import { orderApi } from "~/lib/api/admin-api";

export const orderService = {
  /** List orders with optional filters */
  async list(params?: {
    page?: number;
    status?: string;
    channel?: string;
    search?: string;
    ordering?: string;
  }) {
    return orderApi.getAll(params);
  },

  /** Get a single order by ID */
  async getById(id: number) {
    return orderApi.getById(id);
  },

  /** Update order status */
  async updateStatus(id: number, status: string) {
    return orderApi.updateStatus(id, status);
  },
};
