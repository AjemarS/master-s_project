"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, X, Activity } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { activityEventApi } from "~/lib/api/admin-api";
import type { ActivityEvent as ActivityEventType } from "~/lib/types";

/* ─── Types ─── */

export type { ActivityEventType };

/* ─── Context ─── */

interface ActivityFeedContextValue {
  events: ActivityEventType[];
  pushEvent: (event: { type: "create" | "update" | "delete" | "info"; message: string; entityType: string; entityId?: string | number }) => void;
  markAllRead: () => void;
  unreadCount: number;
}

interface ActivityFeedProviderProps {
  children: React.ReactNode;
  open: boolean;
}

const ActivityFeedContext = createContext<ActivityFeedContextValue | null>(null);

export function useActivityFeed() {
  const ctx = useContext(ActivityFeedContext);
  if (!ctx) throw new Error("useActivityFeed must be used within ActivityFeedProvider");
  return ctx;
}

/* ─── Provider ─── */

export function ActivityFeedProvider({ children, open }: ActivityFeedProviderProps) {
  const [serverEvents, setServerEvents] = useState<ActivityEventType[]>([]);
  const [lastReadCount, setLastReadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch server events only when panel is open — poll every 15s
  useEffect(() => {
    if (!open) return;

    const fetchEvents = async () => {
      try {
        const res = await activityEventApi.list();
        if (res.data) {
          setServerEvents(res.data);
        }
      } catch {
        // silently fail — events are non-critical UX
      }
    };

    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const pushEvent = useCallback(
    (event: { type: "create" | "update" | "delete" | "info"; message: string; entityType: string; entityId?: string | number }) => {
      activityEventApi.create({
        event_type: event.type,
        message: event.message,
        entity_type: event.entityType,
        entity_id: event.entityId != null ? String(event.entityId) : "",
      }).then((res) => {
        if (res.data) {
          setServerEvents((prev) => [res.data!, ...prev].slice(0, 50));
        }
      }).catch(() => {
        // silent fail — events are non-critical UX
      });
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setLastReadCount(serverEvents.length);
  }, [serverEvents.length]);

  return (
    <ActivityFeedContext.Provider
      value={{ events: serverEvents, pushEvent, markAllRead, unreadCount: Math.max(0, serverEvents.length - lastReadCount) }}
    >
      {children}
    </ActivityFeedContext.Provider>
  );
}

/* ─── Activity Feed Panel ─── */

interface ActivityFeedPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityFeedPanel({ open, onOpenChange }: ActivityFeedPanelProps) {
  const t = useTranslations("common");
  const { events, markAllRead } = useActivityFeed();

  if (!open) return null;

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 border-l bg-background shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Activity Feed</h3>
          {events.length > 0 && (
            <span className="text-xs text-muted-foreground">({events.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {events.length > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
              Read all
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Actions you perform in the admin panel will appear here.</p>
          </div>
        ) : (
          <div className="divide-y">
            {events.map((evt) => (
              <div key={evt.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    evt.event_type === "create" ? "bg-green-500" :
                    evt.event_type === "delete" ? "bg-red-500" :
                    evt.event_type === "update" ? "bg-blue-500" :
                    "bg-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{evt.message}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{evt.user_name || "System"}</span>
                      <span>·</span>
                      <span>{formatTimestamp(evt.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
