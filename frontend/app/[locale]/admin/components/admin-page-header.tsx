"use client";

import type { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  backLabel?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Icon className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-primary" />
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
