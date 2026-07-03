export const ORDER_STATUS_LABELS: Record<string, string> = {
  unpaid: "Не сплачено",
  paid: "Сплачено",
  delivering: "В дорозі",
  delivered: "Доставлено",
  completed: "Виконано",
  cancelled: "Скасовано",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
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

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function orderChannelLabel(channel: string): string {
  return channel === "online" ? "Онлайн" : channel === "offline" ? "POS" : channel;
}

export function getAllowedTransitions(status: string): string[] {
  return ORDER_STATUS_TRANSITIONS[status] || [];
}
