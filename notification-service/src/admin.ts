import logger from "./logger";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";

interface UserRecord {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

async function fetchFromAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${AUTH_SERVICE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null as T;
    throw new Error(`Auth service returned ${res.status} for ${path}`);
  }
  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

export async function getAdminUsers(): Promise<UserRecord[]> {
  try {
    return await fetchFromAuth<UserRecord[]>("/api/internal/users?role=admin");
  } catch (err) {
    logger.error(`[admin] Failed to get admin users: ${(err as Error).message}`);
    return [];
  }
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  try {
    return await fetchFromAuth<UserRecord>(`/api/internal/users/${id}`);
  } catch (err) {
    logger.error(`[admin] Failed to get user by id: ${(err as Error).message}`);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    return await fetchFromAuth<UserRecord>(`/api/internal/users/email/${encodeURIComponent(email)}`);
  } catch (err) {
    logger.error(`[admin] Failed to get user by email: ${(err as Error).message}`);
    return null;
  }
}

export async function getUserEmails(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  try {
    return await fetchFromAuth<Record<string, string>>("/api/internal/users/batch", {
      method: "POST",
      body: JSON.stringify({ ids: userIds }),
    });
  } catch (err) {
    logger.error(`[admin] Failed batch email lookup: ${(err as Error).message}`);
    return {};
  }
}
