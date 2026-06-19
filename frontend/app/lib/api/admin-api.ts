/**
 * Admin-specific API client.
 * Uses the shared apiCall helper from ./client.
 */

import type { Product, AdminUser, Category } from "~/lib/types";
import { apiCall, API_URL, AUTH_URL } from "./client";
import type { ApiResponse } from "./client";

// Product API
export const productApi = {
  /**
   * Get all products with optional search & pagination
   */
  async getAll(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<
    ApiResponse<{ results: Product[]; count: number; next: string | null; previous: string | null }>
  > {
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

  /**
   * Get single product by ID
   */
  async getById(id: number): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/`);
  },

  /**
   * Create new product
   */
  async create(product: Partial<Product>): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/`, {
      method: "POST",
      body: JSON.stringify(product),
    });
  },

  /**
   * Update product
   */
  async update(id: number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  },

  /**
   * Delete product
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    return apiCall(`${API_URL}/products/${id}/`, {
      method: "DELETE",
    });
  },

  /**
   * Update product stock
   */
  async updateStock(id: number, quantity: number): Promise<ApiResponse<Product>> {
    return apiCall(`${API_URL}/products/${id}/update_stock/`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    });
  },

  /**
   * Get low stock products
   */
  async getLowStock(threshold = 10): Promise<ApiResponse<Product[]>> {
    return apiCall(`${API_URL}/products/low_stock/?threshold=${threshold}`);
  },
};

// Category API
export const categoryApi = {
  /**
   * Get all categories
   */
  async getAll(): Promise<
    ApiResponse<{ results: Category[]; count: number; next: string | null; previous: string | null }>
  > {
    return apiCall(`${API_URL}/categories/`);
  },

  /**
   * Create a new category
   */
  async create(category: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall(`${API_URL}/categories/`, {
      method: "POST",
      body: JSON.stringify(category),
    });
  },

  /**
   * Update a category
   */
  async update(id: number, category: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall(`${API_URL}/categories/${id}/`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
  },

  /**
   * Delete a category
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    return apiCall(`${API_URL}/categories/${id}/`, {
      method: "DELETE",
    });
  },
};

// User API (using Better Auth admin plugin)
export const userApi = {
  /**
   * List users with optional search
   */
  async list(searchValue?: string): Promise<ApiResponse<{ users: AdminUser[] }>> {
    const url = `${AUTH_URL}/admin/users${
      searchValue ? `?search=${encodeURIComponent(searchValue)}` : ""
    }`;
    return apiCall(url);
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<ApiResponse<AdminUser>> {
    return apiCall(`${AUTH_URL}/admin/users/${id}`);
  },
};