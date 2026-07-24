"use client";

import { LayoutDashboard } from "lucide-react";

interface DashboardHeaderProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function DashboardHeader({ tSum }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
        <LayoutDashboard className="h-10 w-10 text-primary" />
        {tSum("title")}
      </h1>
      <p className="text-muted-foreground">{tSum("subtitle")}</p>
    </div>
  );
}
