"use client";

import { cn } from "~/lib/cn";
import type { SectionStatus } from "./section-status";

export const statusDotColors: Record<SectionStatus, string> = {
  empty: "bg-muted-foreground/40",
  filled: "bg-success",
  partial: "bg-warning",
  error: "bg-destructive",
};

export function StatusDot({ status, label }: { status: SectionStatus; label: string }) {
  return (
    <span
      className={cn(
        "block size-2.5 shrink-0 translate-y-0.5 rounded-full transition-colors",
        statusDotColors[status],
      )}
      title={label}
      aria-label={label}
      role="status"
    />
  );
}
