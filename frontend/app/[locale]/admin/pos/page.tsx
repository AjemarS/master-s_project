import { Suspense } from "react";
import { POSClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  return (
    <Suspense fallback={null}>
      <POSClient />
    </Suspense>
  );
}
