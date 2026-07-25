import { supplierApi } from "~/lib/api/admin-api";
import type { Supplier } from "~/lib/types";

export const supplierService = {
  /** List all suppliers */
  async list() {
    return supplierApi.getAll();
  },

  /** Create a supplier */
  async create(data: Partial<Supplier>) {
    return supplierApi.create(data);
  },

  /** Update a supplier */
  async update(id: number, data: Partial<Supplier>) {
    return supplierApi.update(id, data);
  },

  /** Delete a supplier */
  async remove(id: number) {
    return supplierApi.delete(id);
  },
};
