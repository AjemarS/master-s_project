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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Icon className="h-10 w-10 text-primary" />
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
