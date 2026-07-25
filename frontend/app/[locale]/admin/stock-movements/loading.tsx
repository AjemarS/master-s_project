import { Skeleton } from "~/ui/primitives/skeleton";
import { TableSkeleton } from "../components/loading-skeleton";

export default function StockMovementsLoading() {
  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <TableSkeleton rows={8} cols={8} />
      </div>
    </div>
  );
}
