import { Suspense } from "react";
import ProductsPageContent from "./page-content";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading products...</p></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
