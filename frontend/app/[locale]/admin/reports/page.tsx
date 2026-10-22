import { Suspense } from "react";
import { SWRConfig } from "swr";
import { cookies } from "next/headers";
import { ReportsClient } from "./page-client";

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

export default async function ReportsPage() {
  const fallback: Record<string, unknown> = {};
  // Only the range-independent report is prefetched: the others are keyed by the client's date filter
  const inventoryValue = await fetchFromApi("/reports/inventory-value/");
  if (inventoryValue) fallback["/reports/inventory-value"] = inventoryValue;

  return (
    <SWRConfig value={{ fallback }}>
      <Suspense fallback={<div className="p-8 space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded" /></div>}>
        <ReportsClient />
      </Suspense>
    </SWRConfig>
  );
}
