import React from "react";

import type { Notification } from "./notification-center";
import { NotificationCenter } from "./notification-center";
import { useCurrentUser } from "~/lib/auth-client";
import { useNotifications } from "~/lib/hooks/use-api-data";

export function NotificationsWidget() {
  const { user } = useCurrentUser();
  const userId = user?.id;
  const {
    notifications: rawItems,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  } = useNotifications(userId);

  const notifications = React.useMemo(
    () =>
      rawItems.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        type: mapType(n.type),
        read: n.read,
        timestamp: new Date(n.created_at),
      })),
    [rawItems],
  );

  return (
    <NotificationCenter
      notifications={notifications}
      unreadCount={unreadCount}
      loading={isLoading}
      onClearAll={clearAll}
      onDismiss={dismiss}
      onMarkAllAsRead={markAllAsRead}
      onMarkAsRead={markAsRead}
    />
  );
}

function mapType(type: string): Notification["type"] {
  switch (type) {
    case "order_confirmed":
    case "order_delivered":
      return "success";
    case "order_shipped":
    case "marketing":
      return "info";
    case "order_cancelled":
      return "error";
    case "low_stock":
      return "warning";
    default:
      return "info";
  }
}
