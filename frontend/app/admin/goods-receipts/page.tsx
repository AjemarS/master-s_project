import { Suspense } from "react";
import { GoodsReceiptsClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptsPage() {
  return (
    <Suspense fallback={null}>
      <GoodsReceiptsClient />
    </Suspense>
  );
}
