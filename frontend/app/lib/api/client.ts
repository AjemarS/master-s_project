/**
 * Unified API client for all frontend API calls.
 * Provides consistent error handling, base URL, and credentials.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";

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

export { apiCall, API_URL, AUTH_URL };