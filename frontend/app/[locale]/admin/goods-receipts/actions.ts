import { goodsReceiptApi } from "~/lib/api/admin-api";
import type { GoodsReceiptNote } from "~/lib/types";

export const goodsReceiptService = {
  async list() {
    return goodsReceiptApi.getAll();
  },

  async create(data: Partial<GoodsReceiptNote>) {
    return goodsReceiptApi.create(data);
  },

  async productInfo(product_id: number, warehouse_id: number) {
    return goodsReceiptApi.productInfo(product_id, warehouse_id);
  },
};
