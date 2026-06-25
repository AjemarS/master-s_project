import { Suspense } from "react";
import ProductsPageContent from "./page-content";
import ProductsLoading from "./loading";

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageContent />
    </Suspense>
  );
}
