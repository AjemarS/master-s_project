import { cookies } from "next/headers";
import type { UserWithRole } from "better-auth/plugins/admin";
import UsersPageClient from "./page-client";

const AUTH_URL = process.env.PROXY_AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";

async function getUsers(): Promise<{ users: UserWithRole[]; error?: string }> {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(`${AUTH_URL}/admin/users`, {
      headers: { cookie: cookieHeader || "" },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { users: [], error: "Failed to load users" };
    }

    const data = await response.json();
    return { users: data.users || [] };
  } catch {
    return { users: [], error: "Failed to connect to auth service" };
  }
}

export default async function UsersPage() {
  const { users, error } = await getUsers();
  return <UsersPageClient initialUsers={users} initialError={error ?? null} />;
}
