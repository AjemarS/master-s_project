import { categoryApi } from "~/lib/api/admin-api";
import type { Category } from "~/lib/types";

export const categoryService = {
  async list() {
    return categoryApi.getAll();
  },

  async create(data: Partial<Category>) {
    return categoryApi.create(data);
  },

  async update(id: number, data: Partial<Category>) {
    return categoryApi.update(id, data);
  },

  async remove(id: number) {
    return categoryApi.delete(id);
  },
};
