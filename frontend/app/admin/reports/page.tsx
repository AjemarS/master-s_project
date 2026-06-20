import { Suspense } from "react";
import { PageHeader } from "~/ui/components/page-header";
import { ReportsClient } from "./page-client";
import { StatsCardSkeleton } from "../components/loading-skeleton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Sales, revenue, and margin analytics" />
      <Suspense fallback={<StatsCardSkeleton />}>
        <ReportsClient />
      </Suspense>
    </div>
  );
}
