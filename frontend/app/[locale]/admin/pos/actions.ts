import { productApi, warehouseApi, stockApi, orderApi } from "~/lib/api/admin-api";

export interface ReceiptItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

export const posService = {
  /** Search products by name */
  async searchProducts(search: string) {
    return productApi.getAll({ search, pageSize: 20 });
  },

  /** List all warehouses */
  async getWarehouses() {
    return warehouseApi.getAll();
  },

  /** Get stock data for a warehouse (supports cancellation) */
  async getStock(warehouseId: number, signal?: AbortSignal) {
    return stockApi.getAll({ warehouse_id: warehouseId }, signal);
  },

  /** Submit a POS order */
  async createOrder(data: {
    warehouse_id: number;
    customer_name?: string;
    customer_phone?: string;
    items: { product_id: number; quantity: number; price: number }[];
  }) {
    return orderApi.pos(data);
  },
};
