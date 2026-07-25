import { supplierApi } from "~/lib/api/admin-api";
import type { Supplier } from "~/lib/types";

export const supplierService = {
  async list() {
    return supplierApi.getAll();
  },

  async create(data: Partial<Supplier>) {
    return supplierApi.create(data);
  },

  async update(id: number, data: Partial<Supplier>) {
    return supplierApi.update(id, data);
  },

  async remove(id: number) {
    return supplierApi.delete(id);
  },
};
