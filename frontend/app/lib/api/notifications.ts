import { apiCall, API_URL } from "./client";

const BASE = `${API_URL}/notifications`;

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  channel: string;
  read: boolean;
  dismissed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationPreferences {
  user_id: string;
  order_confirmed_email: boolean;
  order_confirmed_in_app: boolean;
  order_shipped_email: boolean;
  order_shipped_in_app: boolean;
  order_delivered_email: boolean;
  order_delivered_in_app: boolean;
  order_cancelled_email: boolean;
  order_cancelled_in_app: boolean;
  marketing_email: boolean;
  marketing_in_app: boolean;
  low_stock_email: boolean;
  low_stock_in_app: boolean;
}

export const notificationsApi = {
  list: (userId: string, page = 1, limit = 20) =>
    apiCall<NotificationListResponse>(`${BASE}?userId=${userId}&page=${page}&limit=${limit}`),

  unreadCount: (userId: string) =>
    apiCall<{ count: number }>(`${BASE}/unread/${userId}`),

  markRead: (id: string) =>
    apiCall<NotificationItem>(`${BASE}/${id}/read`, { method: "PATCH" }),

  markAllRead: (userId: string) =>
    apiCall<{ success: boolean }>(`${BASE}/read-all/${userId}`, { method: "PATCH" }),

  dismiss: (id: string) =>
    apiCall<NotificationItem>(`${BASE}/${id}/dismiss`, { method: "POST" }),

  clearAll: (userId: string) =>
    apiCall<{ success: boolean }>(`${BASE}/${userId}`, { method: "DELETE" }),

  getPreferences: (userId: string) =>
    apiCall<NotificationPreferences>(`${BASE}/preferences/${userId}`),

  updatePreferences: (userId: string, prefs: Partial<NotificationPreferences>) =>
    apiCall<NotificationPreferences>(`${BASE}/preferences/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

export function createNotificationSSE(userId: string, onNotification: (n: NotificationItem) => void): () => void {
  const url = `${BASE}/stream?userId=${userId}`;
  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "connected") return;
      onNotification(data);
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export type { NotificationItem as Notification };
