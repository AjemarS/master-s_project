import { Suspense } from "react";
import { WarehousesClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  return (
    <Suspense fallback={null}>
      <WarehousesClient />
    </Suspense>
  );
}
