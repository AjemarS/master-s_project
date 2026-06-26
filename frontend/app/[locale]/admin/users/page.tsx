import { Suspense } from "react";
import UsersPageClient from "./page-client";

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded" /></div>}>
      <UsersPageClient />
    </Suspense>
  );
}
