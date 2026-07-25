import { TableSkeleton } from "../components/loading-skeleton";
import { Skeleton } from "~/ui/primitives/skeleton";

export default function AdminGoodsReceiptsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
