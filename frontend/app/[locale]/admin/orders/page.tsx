import { Suspense } from "react";
import { AdminOrdersClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersClient />
    </Suspense>
  );
}
