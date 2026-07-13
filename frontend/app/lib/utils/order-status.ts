import { Circle, Clock, Truck, CheckCircle2, XCircle, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ORDER_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  paid: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200 dark:border-green-800",
  delivering: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
};

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  unpaid: ["paid", "cancelled"],
  paid: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const ORDER_STATUS_ICONS: Record<string, LucideIcon> = {
  unpaid: Clock,
  paid: Circle,
  delivering: Truck,
  delivered: Package,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function orderStatusLabel(t: (key: string) => string, status: string): string {
  return t(status) || status;
}

export function orderChannelLabel(t: (key: string) => string, channel: string): string {
  if (channel === "online") return t("online");
  if (channel === "offline") return t("offline");
  return channel;
}

export function getAllowedTransitions(status: string): string[] {
  return ORDER_STATUS_TRANSITIONS[status] || [];
}

export function getStatusIcon(status: string): LucideIcon {
  return ORDER_STATUS_ICONS[status] || Circle;
}
