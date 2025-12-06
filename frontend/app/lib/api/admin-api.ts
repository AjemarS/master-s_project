/**
 * Centralized API client for admin operations
 * Handles all API calls with proper error handling and type safety
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";

// Types
export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Helper function for API calls
async function apiCall<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "An error occurred" };
      }

      return {
        error: {
          message: errorData.message || errorData.detail || "Request failed",
          status: response.status,
          details: errorData,
        },
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error",
        details: error,
      },
    };
  }
}

// Product API
export const productApi = {
  /**
   * Get all products with optional pagination
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

// User API (using Better Auth admin plugin)
export const userApi = {
  /**
   * List users with optional search
   */
  async list(searchValue?: string): Promise<ApiResponse<{ users: AdminUser[] }>> {
    // This uses the Better Auth admin client from auth-client
    // We'll import it where needed
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

// Types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  stock: number;
  inStock: boolean;
  category: number;
  categoryName?: string;
  image?: string | null;
  features?: string[];
  specs?: Record<string, unknown>;
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  status?: string;
  banned?: boolean;
  createdAt: string;
  emailVerified?: boolean;
}
