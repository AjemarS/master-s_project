import { StatsGridSkeleton } from "../components/loading-skeleton";
import { Skeleton } from "~/ui/primitives/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <StatsGridSkeleton count={6} />
    </div>
  );
}
