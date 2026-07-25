import { goodsReceiptApi } from "~/lib/api/admin-api";
import type { GoodsReceiptNote } from "~/lib/types";

export const goodsReceiptService = {
  /** List all goods receipt notes */
  async list() {
    return goodsReceiptApi.getAll();
  },

  /** Create a new goods receipt note */
  async create(data: Partial<GoodsReceiptNote>) {
    return goodsReceiptApi.create(data);
  },

  /** Update an existing goods receipt note */
  async update(id: number, data: Partial<GoodsReceiptNote>) {
    return goodsReceiptApi.update(id, data);
  },

  /** Delete a goods receipt note */
  async remove(id: number) {
    return goodsReceiptApi.delete(id);
  },
};
