import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { SuppliersClient } from "./page-client";
import { TableSkeleton } from "../components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage suppliers for goods receipt" />
      <Suspense fallback={<TableSkeleton />}>
        <SuppliersClient />
      </Suspense>
    </div>
  );
}
