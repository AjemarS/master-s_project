import { Suspense } from "react";
import { ReturnsClient } from "./page-client";
import AdminReturnsLoading from "./loading";

export default function ReturnsPage() {
  return (
    <Suspense fallback={<AdminReturnsLoading />}>
      <ReturnsClient />
    </Suspense>
  );
}
