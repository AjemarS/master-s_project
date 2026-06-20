import { Suspense } from "react";
import { SuppliersClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  return (
    <Suspense fallback={null}>
      <SuppliersClient />
    </Suspense>
  );
}
