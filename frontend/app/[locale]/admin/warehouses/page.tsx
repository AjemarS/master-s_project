import { Suspense } from "react";
import { SWRConfig } from "swr";
import { cookies } from "next/headers";
import { WarehousesClient } from "./page-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

async function fetchFromApi(path: string) {
  const cookieStore = cookies();
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

export default async function WarehousesPage() {
  const fallback: Record<string, unknown> = {};
  const data = await fetchFromApi("/warehouses");
  if (data) fallback["/warehouses"] = data;

  return (
    <SWRConfig value={{ fallback }}>
      <Suspense fallback={<div className="p-8 space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded" /></div>}>
        <WarehousesClient />
      </Suspense>
    </SWRConfig>
  );
}
