import { Suspense } from "react";
import { POSClient } from "./page-client";
import POSLoading from "./loading";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  return (
    <Suspense fallback={<POSLoading />}>
      <POSClient />
    </Suspense>
  );
}
