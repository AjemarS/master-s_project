"use client";

import { LayoutDashboard } from "lucide-react";
import { StatsCardSkeleton } from "../../components";

interface DashboardLoadingSkeletonProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function DashboardLoadingSkeleton({ tSum }: DashboardLoadingSkeletonProps) {
  return (
    <div className="min-h-dvh bg-muted/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-primary" />
            {tSum("title")}
          </h1>
          <p className="text-muted-foreground">{tSum("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
