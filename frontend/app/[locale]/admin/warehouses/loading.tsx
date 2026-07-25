import { Skeleton } from "~/ui/primitives/skeleton";
import { TableSkeleton } from "../components/loading-skeleton";

export default function AdminWarehousesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <TableSkeleton rows={4} cols={4} />
      <TableSkeleton rows={4} cols={5} />
    </div>
  );
}
