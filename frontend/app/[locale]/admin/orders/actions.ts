import { orderApi } from "~/lib/api/admin-api";

export const orderService = {
  async list(params?: {
    page?: number;
    status?: string;
    channel?: string;
    search?: string;
    ordering?: string;
  }) {
    return orderApi.getAll(params);
  },

  async getById(id: number) {
    return orderApi.getById(id);
  },

  async updateStatus(id: number, status: string) {
    return orderApi.updateStatus(id, status);
  },
};
