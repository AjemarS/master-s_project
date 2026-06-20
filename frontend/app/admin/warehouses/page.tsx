import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { WarehousesClient } from "./page-client";
import { TableSkeleton } from "../components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses & Stock" description="Manage warehouses, showrooms, and stock levels" />
      <Suspense fallback={<TableSkeleton />}>
        <WarehousesClient />
      </Suspense>
    </div>
  );
}
