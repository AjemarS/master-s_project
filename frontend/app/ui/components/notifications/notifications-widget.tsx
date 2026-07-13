import React from "react";

import type { Notification } from "./notification-center";
import { NotificationCenter } from "./notification-center";
import { useCurrentUser } from "~/lib/auth-client";
import { notificationsApi, createNotificationSSE } from "~/lib/api/notifications";

export function NotificationsWidget() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const userId = user?.id;

  React.useEffect(() => {
    if (!userId) return;

    cleanupRef.current = null;

    const init = async () => {
      setLoading(true);
      const [listRes, unreadRes] = await Promise.all([
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

      if (unreadRes.data?.count !== undefined) {
        setUnreadCount(unreadRes.data.count);
      }

      setLoading(false);

      cleanupRef.current = createNotificationSSE(userId, (newNotif) => {
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
        setUnreadCount((prev) => prev + 1);
      });
    };

    init();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    const res = await notificationsApi.markRead(id);
    if (res.data) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    const res = await notificationsApi.markAllRead(userId);
    if (res.data) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
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
      setUnreadCount(0);
    }
  };

  return (
    <NotificationCenter
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
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
