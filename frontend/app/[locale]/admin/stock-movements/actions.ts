import { stockMovementApi, stockAdjustApi, stockApi, productApi } from "~/lib/api/admin-api";

export const stockMovementService = {
  async list(params?: Record<string, string | number | undefined>) {
    return stockMovementApi.getAll(params);
  },

  async adjustStock(data: { product_id: number; warehouse_id: number; new_quantity: number; reason?: string }) {
    return stockAdjustApi.adjust(data);
  },

  async searchProducts(search: string) {
    return productApi.getAll({ search, pageSize: 10 });
  },

  async getProductById(id: number) {
    return productApi.getById(id);
  },

  async getStock(params: { product_id?: number; warehouse_id?: number }) {
    return stockApi.getAll(params);
  },
};
