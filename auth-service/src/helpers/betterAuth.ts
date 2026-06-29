import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

export interface BetterAuthImpersonateResponse {
  user: { id: string; name: string } | null;
  headers: Record<string, string | string[]>;
}

export interface BetterAuthStopImpersonateResponse {
  user: { id: string } | null;
  headers: Record<string, string | string[]>;
}

export interface BetterAuthSessionResponse {
  user: Record<string, unknown>;
  session: { token: string; id: string };
}

export function getSetCookieHeaders(response: { headers?: Record<string, string | string[]> }): string | string[] | undefined {
  if (!response?.headers) return undefined;
  for (const [key, value] of Object.entries(response.headers)) {
    if (key.toLowerCase() === "set-cookie") return value;
  }
  return undefined;
}

export async function apiImpersonateUser(userId: string, headers: Record<string, string | string[] | undefined>) {
  const response = await auth.api.impersonateUser({
    headers: fromNodeHeaders(headers),
    body: { userId },
  }) as unknown as BetterAuthImpersonateResponse;
  return response;
}

export async function apiStopImpersonating(headers: Record<string, string | string[] | undefined>) {
  const response = await auth.api.stopImpersonating({
    headers: fromNodeHeaders(headers),
  }) as unknown as BetterAuthStopImpersonateResponse;
  return response;
}
