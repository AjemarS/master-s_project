"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

interface StatusCount {
  status: string;
  count: number;
}

interface OrderStatusCardProps {
  statusCounts: StatusCount[];
  isLoading: boolean;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string) => string;
}

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-amber-500",
  paid: "bg-blue-500",
  delivering: "bg-purple-500",
  delivered: "bg-teal-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-400",
};

const STATUS_ORDER = ["unpaid", "paid", "delivering", "delivered", "completed", "cancelled"];

export default function OrderStatusCard({
  statusCounts,
  isLoading,
  tSum,
  tc,
}: OrderStatusCardProps) {
  // Sort by canonical order
  const sorted = STATUS_ORDER.map((s) => {
    const found = statusCounts.find((sc) => sc.status === s);
    return found || { status: s, count: 0 };
  });
  const total = sorted.reduce((sum, s) => sum + s.count, 0);

  if (isLoading) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            {tSum("orderStatusSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            {tSum("orderStatusSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">{tSum("noOrders")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <Link href="/admin/orders" className="flex items-center gap-2 hover:underline">
            <BarChart3 className="h-5 w-5 text-primary" />
            {tSum("orderStatusSummary")}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stacked horizontal bar showing proportions */}
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex mb-3">
          {sorted.map((s) =>
            s.count > 0 ? (
              <div
                key={s.status}
                className={`${STATUS_COLORS[s.status] || "bg-gray-400"} transition-all`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.status}: ${s.count}`}
              />
            ) : null
          )}
        </div>

        {/* Status legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {sorted.filter((s) => s.count > 0).map((s) => (
            <div key={s.status} className="flex items-center gap-2 text-xs">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_COLORS[s.status] || "bg-gray-400"}`} />
              <span className="text-muted-foreground capitalize">{tc(s.status)}</span>
              <span className="font-medium text-foreground ml-auto">{s.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
