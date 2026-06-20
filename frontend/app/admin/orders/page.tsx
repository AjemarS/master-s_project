import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { AdminOrdersClient } from "./page-client";
import { TableSkeleton } from "../components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage customer orders, update statuses"
      />
      <Suspense fallback={<TableSkeleton />}>
        <AdminOrdersClient />
      </Suspense>
    </div>
  );
}
