import { TableSkeleton } from "../components/loading-skeleton";
import { Skeleton } from "~/ui/primitives/skeleton";

export default function AdminPromoCodesLoading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-48" />
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
}
