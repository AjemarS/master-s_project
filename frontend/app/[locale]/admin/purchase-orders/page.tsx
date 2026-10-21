import { Suspense } from "react";
import { PurchaseOrdersClient } from "./page-client";
import AdminPurchaseOrdersLoading from "./loading";

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<AdminPurchaseOrdersLoading />}>
      <PurchaseOrdersClient />
    </Suspense>
  );
}
