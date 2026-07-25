import { TableSkeleton } from "../components/loading-skeleton";
import { Skeleton } from "~/ui/primitives/skeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
      </div>
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
