import { Suspense } from "react";
import { SWRConfig } from "swr";
import { cookies } from "next/headers";
import { SuppliersClient } from "./page-client";
import AdminSuppliersLoading from "./loading";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

async function fetchFromApi(path: string) {
  const cookieStore = await cookies();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { cookie: cookieStore.toString() || "" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SuppliersPage() {
  const fallback: Record<string, unknown> = {};
  const data = await fetchFromApi("/suppliers");
  if (data) fallback["/suppliers"] = data;

  return (
    <SWRConfig value={{ fallback }}>
      <Suspense fallback={<AdminSuppliersLoading />}>
        <SuppliersClient />
      </Suspense>
    </SWRConfig>
  );
}
