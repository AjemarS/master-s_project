/**
 * Unified API client for all frontend API calls.
 * Provides consistent error handling, base URL, and credentials.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";
const INVENTORY_API_URL = `${API_URL}/inventory`;
const ORDERS_API_URL = `${API_URL}/orders`;

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

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

export { apiCall, API_URL, AUTH_URL, INVENTORY_API_URL, ORDERS_API_URL };

// Cart API methods
export const cartApi = {
  get: () => apiCall<import("../types").CartResponse>(`${API_URL}/cart/`),
  addItem: (productId: number, quantity = 1) =>
    apiCall(`${API_URL}/cart/add_item/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    }),
  updateItem: (productId: number, quantity: number) =>
    apiCall(`${API_URL}/cart/update_item/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    }),
  removeItem: (productId: number) =>
    apiCall(`${API_URL}/cart/remove_item/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId }),
    }),
  clear: () => apiCall(`${API_URL}/cart/clear/`, { method: "POST" }),
  merge: (items: { id: string; quantity: number }[]) =>
    apiCall(`${API_URL}/cart/merge/`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};
