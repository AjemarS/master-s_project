/**
 * Centralized error handler for frontend API calls.
 * Provides consistent error formatting and optional toast notifications.
 */
import { toast } from "sonner";

export interface ParsedError {
  message: string;
  status?: number;
  fields?: Record<string, string[]>;
  raw?: unknown;
}

/**
 * Parse an API error response into a structured format.
 * Handles different error shapes from different services.
 */
export function parseApiError(error: unknown): ParsedError {
  // Already parsed by our API client
  if (error && typeof error === "object" && "message" in error) {
    const e = error as Record<string, unknown>;
    return {
      message: (e.message as string) || "An unexpected error occurred",
      status: e.status as number | undefined,
      fields: e.fields as Record<string, string[]> | undefined,
      raw: error,
    };
  }

  // Standard Error instance
  if (error instanceof Error) {
    return {
      message: error.message,
      raw: error,
    };
  }

  // String error
  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "An unexpected error occurred", raw: error };
}

/**
 * The most specific human message in an apiCall error: DRF field errors come as
 * {field: ["message"]} and service errors as {error, detail}, both hidden behind "Request failed".
 */
export function apiErrorText(error: { message: string; details?: unknown }): string {
  const d = error.details;
  if (d && typeof d === "object") {
    const body = d as Record<string, unknown>;
    if (typeof body.error === "string") return typeof body.detail === "string" ? `${body.error}: ${body.detail}` : body.error;
    for (const value of Object.values(body)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (typeof value === "string") return value;
    }
  }
  return error.message;
}

/**
 * Show an error toast notification.
 */
export function showErrorToast(error: unknown, fallbackMessage?: string): void {
  const parsed = parseApiError(error);
  toast.error(parsed.message || fallbackMessage || "Something went wrong");
}

/**
 * Show a success toast notification.
 */
export function showSuccessToast(message: string): void {
  toast.success(message);
}