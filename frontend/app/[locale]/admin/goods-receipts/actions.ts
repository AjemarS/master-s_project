import { goodsReceiptApi } from "~/lib/api/admin-api";
import type { GoodsReceiptNote } from "~/lib/types";

export const goodsReceiptService = {
  async list() {
    return goodsReceiptApi.getAll();
  },

  async create(data: Partial<GoodsReceiptNote>) {
    return goodsReceiptApi.create(data);
  },

  async update(id: number, data: Partial<GoodsReceiptNote>) {
    return goodsReceiptApi.update(id, data);
  },

  async remove(id: number) {
    return goodsReceiptApi.delete(id);
  },
};
