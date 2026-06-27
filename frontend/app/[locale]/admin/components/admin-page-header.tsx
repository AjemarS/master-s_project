"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  backHref = "/admin/summary",
  backLabel,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      {backHref && (
        <Button variant="ghost" asChild className="mb-4 flex items-center gap-2">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <Icon className="h-10 w-10 text-purple-600" />
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
