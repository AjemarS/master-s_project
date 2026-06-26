import React from "react";

import type { Notification } from "./notification-center";

import { NotificationCenter } from "./notification-center";
import { useCurrentUser } from "~/lib/auth-client";
import { notificationsApi, createNotificationSSE } from "~/lib/api/notifications";

export function NotificationsWidget() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const userId = user?.id;

  React.useEffect(() => {
    if (!userId) return;

    let cleanup: (() => void) | null = null;

    const init = async () => {
      const [listRes] = await Promise.all([
        notificationsApi.list(userId, 1, 50),
        notificationsApi.unreadCount(userId),
      ]);

      if (listRes.data) {
        const mapped: Notification[] = listRes.data.items.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          type: mapType(n.type),
          read: n.read,
          timestamp: new Date(n.created_at),
        }));
        setNotifications(mapped);
      }

      cleanup = createNotificationSSE(userId, (newNotif) => {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          if (exists) return prev;
          return [{
            id: newNotif.id,
            title: newNotif.title,
            description: newNotif.description,
            type: mapType(newNotif.type),
            read: false,
            timestamp: new Date(newNotif.created_at),
          }, ...prev];
        });
      });
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    const res = await notificationsApi.markRead(id);
    if (res.data) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    const res = await notificationsApi.markAllRead(userId);
    if (res.data) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleDismiss = async (id: string) => {
    const res = await notificationsApi.dismiss(id);
    if (res.data) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    const res = await notificationsApi.clearAll(userId);
    if (res.data) {
      setNotifications([]);
    }
  };

  return (
    <NotificationCenter
      notifications={notifications}
      onClearAll={handleClearAll}
      onDismiss={handleDismiss}
      onMarkAllAsRead={handleMarkAllAsRead}
      onMarkAsRead={handleMarkAsRead}
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
