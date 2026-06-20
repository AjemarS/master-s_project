import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { MyOrdersClient } from "./page-client";
import { TableSkeleton } from "~/admin/components"

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="My Orders" description="Track your order status" />
      <Suspense fallback={<TableSkeleton />}>
        <MyOrdersClient />
      </Suspense>
    </div>
  );
}
