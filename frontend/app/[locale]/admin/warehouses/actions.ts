import { warehouseApi, stockApi, stockTransferApi, productApi } from "~/lib/api/admin-api";
import type { Warehouse } from "~/lib/types";

export const warehouseService = {
  async list() {
    return warehouseApi.getAll();
  },

  async create(data: Partial<Warehouse>) {
    return warehouseApi.create(data);
  },

  async update(id: number, data: Partial<Warehouse>) {
    return warehouseApi.update(id, data);
  },

  async remove(id: number) {
    return warehouseApi.delete(id);
  },

  async getStock(params: { product_id?: number; warehouse_id?: number; pageSize?: number }, signal?: AbortSignal) {
    return stockApi.getAll(params, signal);
  },

  async transfer(data: {
    product_id: number;
    from_warehouse_id: number;
    to_warehouse_id: number;
    quantity: number;
    notes?: string;
  }) {
    return stockTransferApi.transfer(data);
  },

  async searchProducts(search: string) {
    return productApi.getAll({ search, pageSize: 10 });
  },

  async getProductById(id: number) {
    return productApi.getById(id);
  },
};
