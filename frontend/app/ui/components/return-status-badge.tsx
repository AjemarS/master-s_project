"use client";

import { useTranslations } from "next-intl";
import { Badge } from "~/ui/primitives/badge";
import type { ReturnStatus } from "~/lib/types";

// Same palette as order statuses: amber waits on the store, green is done, red is a refusal
const COLORS: Record<ReturnStatus, string> = {
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  approved: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  received: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const t = useTranslations("returns");
  return <Badge className={`text-xs ${COLORS[status]}`}>{t(`status_${status}`)}</Badge>;
}
