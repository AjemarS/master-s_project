import { reportApi } from "~/lib/api/admin-api";

export const reportService = {
  async sales(from?: string, to?: string) {
    return reportApi.sales(from, to);
  },

  async revenue(from?: string, to?: string) {
    return reportApi.revenue(from, to);
  },

  async inventoryValue() {
    return reportApi.inventoryValue();
  },

  async dailySales() {
    return reportApi.dailySales();
  },
};
