import type { Product, AdminUser, Category, Warehouse, Stock, Supplier, GoodsReceiptNote, Order, OrderDetail, SalesReport, RevenueReport } from "~/lib/types";
import { apiCall, API_URL, AUTH_URL } from "./client";
import type { ApiResponse } from "./client";

export const productApi = {
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<ApiResponse<{ results: Product[]; count: number; next: string | null; previous: string | null }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.pageSize) queryParams.append("page_size", params.pageSize.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category.toString());
    if (params?.minPrice) queryParams.append("min_price", params.minPrice.toString());
    if (params?.maxPrice) queryParams.append("max_price", params.maxPrice.toString());
    if (params?.inStock !== undefined) queryParams.append("inStock", params.inStock.toString());
    const url = `${API_URL}/products/${queryParams.toString() ? `?${queryParams}` : ""}`;
    return apiCall(url);
  },

  async getById(id: number): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/`);
  },

  async create(product: Partial<Product>): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/`, { method: "POST", body: JSON.stringify(product) });
  },

  async update(id: number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/`, { method: "PUT", body: JSON.stringify(product) });
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiCall(`${API_URL}/products/${id}/`, { method: "DELETE" });
  },

  async updateStock(id: number, quantity: number): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/update_stock/`, {
      method: "POST", body: JSON.stringify({ quantity }),
    });
  },

  async getLowStock(threshold = 10): Promise<ApiResponse<Product[]>> {
    return apiCall(`${API_URL}/products/low_stock/?threshold=${threshold}`);
  },
};

export const categoryApi = {
  async getAll(): Promise<ApiResponse<{ results: Category[]; count: number; next: string | null; previous: string | null }>> {
    return apiCall(`${API_URL}/categories/`);
  },

  async create(category: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall(`${API_URL}/categories/`, { method: "POST", body: JSON.stringify(category) });
  },

  async update(id: number, category: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall(`${API_URL}/categories/${id}/`, { method: "PUT", body: JSON.stringify(category) });
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiCall(`${API_URL}/categories/${id}/`, { method: "DELETE" });
  },
};

export const userApi = {
  async list(searchValue?: string): Promise<ApiResponse<{ users: AdminUser[] }>> {
    const url = `${AUTH_URL}/admin/users${searchValue ? `?search=${encodeURIComponent(searchValue)}` : ""}`;
    return apiCall(url);
  },

  async getById(id: string): Promise<ApiResponse<AdminUser>> {
    return apiCall(`${AUTH_URL}/admin/users/${id}`);
  },
};

export const warehouseApi = {
  async getAll(): Promise<ApiResponse<{ results: Warehouse[]; count: number; next: string | null; previous: string | null }>> {
    return apiCall(`${API_URL}/warehouses/`);
  },

  async create(data: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
    return apiCall(`${API_URL}/warehouses/`, { method: "POST", body: JSON.stringify(data) });
  },
};

export const stockApi = {
  async getAll(params?: { warehouse_id?: number; product_id?: number }): Promise<ApiResponse<{ results: Stock[]; count: number }>> {
    const q = new URLSearchParams();
    if (params?.warehouse_id) q.append("warehouse_id", String(params.warehouse_id));
    if (params?.product_id) q.append("product_id", String(params.product_id));
    return apiCall(`${API_URL}/stock/${q.toString() ? `?${q}` : ""}`);
  },
};

export const supplierApi = {
  async getAll(): Promise<ApiResponse<{ results: Supplier[]; count: number }>> {
    return apiCall(`${API_URL}/suppliers/`);
  },

  async create(data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return apiCall(`${API_URL}/suppliers/`, { method: "POST", body: JSON.stringify(data) });
  },
};

export const goodsReceiptApi = {
  async getAll(): Promise<ApiResponse<{ results: GoodsReceiptNote[]; count: number }>> {
    return apiCall(`${API_URL}/goods-receipts/`);
  },

  async create(data: Partial<GoodsReceiptNote>): Promise<ApiResponse<GoodsReceiptNote>> {
    return apiCall(`${API_URL}/goods-receipts/`, { method: "POST", body: JSON.stringify(data) });
  },
};

export const orderApi = {
  async getAll(params?: { page?: number; status?: string; channel?: string }): Promise<
    ApiResponse<{ results: Order[]; count: number; next: string | null; previous: string | null }>
  > {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.status) q.append("status", params.status);
    if (params?.channel) q.append("channel", params.channel);
    return apiCall(`${API_URL}/orders/${q.toString() ? `?${q}` : ""}`);
  },

  async getById(id: number): Promise<ApiResponse<OrderDetail>> {
    return apiCall(`${API_URL}/orders/${id}/`);
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse<OrderDetail>> {
    return apiCall(`${API_URL}/orders/${id}/status/`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
  },

  async getMy(): Promise<ApiResponse<{ results: Order[]; count: number }>> {
    return apiCall(`${API_URL}/orders/my/`);
  },

  async pos(data: {
    warehouse_id: number; customer_name?: string; customer_phone?: string;
    items: { product_id: number; quantity: number; price: number }[];
  }): Promise<ApiResponse<OrderDetail>> {
    return apiCall(`${API_URL}/orders/pos/`, { method: "POST", body: JSON.stringify(data) });
  },
};

export const reportApi = {
  async sales(): Promise<ApiResponse<SalesReport>> {
    return apiCall(`${API_URL}/reports/sales/`);
  },

  async revenue(): Promise<ApiResponse<RevenueReport>> {
    return apiCall(`${API_URL}/reports/revenue/`);
  },
};
