"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  borderColor?: string;
  trend?: {
    label: string;
    icon?: ReactNode;
  };
}

export default function StatCard({ title, value, icon, borderColor, trend }: StatCardProps) {
  return (
    <Card
      className={`hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 dark:bg-card dark:border-border ${borderColor ?? "border-t-primary"}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend.icon}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
