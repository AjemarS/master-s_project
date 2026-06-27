"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  colSpan?: number;
}

export function EmptyState({ icon: Icon, message, colSpan }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan ?? 99} className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Icon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        {message}
      </td>
    </tr>
  );
}
