import { Suspense } from "react";
import { POSClient } from "./page-client";
import { PageHeader } from "~/ui/components/page-header";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="POS Terminal" description="Offline sales terminal for showroom" />
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading POS terminal...</div>}>
        <POSClient />
      </Suspense>
    </div>
  );
}
