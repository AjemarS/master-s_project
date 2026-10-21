import { TableSkeleton } from "../components/loading-skeleton";
import { Skeleton } from "~/ui/primitives/skeleton";

export default function AdminReturnsLoading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-48" />
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
