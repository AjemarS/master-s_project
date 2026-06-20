import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { GoodsReceiptsClient } from "./page-client";
import { TableSkeleton } from "../components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Goods Receipts" description="Create and view goods receipt notes (GRN)" />
      <Suspense fallback={<TableSkeleton />}>
        <GoodsReceiptsClient />
      </Suspense>
    </div>
  );
}
