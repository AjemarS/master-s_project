import { Suspense } from "react";
import { ReportsClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsClient />
    </Suspense>
  );
}
