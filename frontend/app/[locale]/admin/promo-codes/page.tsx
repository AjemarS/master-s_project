import { Suspense } from "react";
import { PromoCodesClient } from "./page-client";
import AdminPromoCodesLoading from "./loading";

export default function PromoCodesPage() {
  return (
    <Suspense fallback={<AdminPromoCodesLoading />}>
      <PromoCodesClient />
    </Suspense>
  );
}
