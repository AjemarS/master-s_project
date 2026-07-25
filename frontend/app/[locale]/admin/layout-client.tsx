"use client";

import { useState } from "react";
import { ActivityFeedProvider, ActivityFeedPanel, useActivityFeed } from "./components/activity-feed";
import { Button } from "~/ui/primitives/button";
import { Zap } from "lucide-react";

/** Inner component that reads the feed context (rendered inside the provider) */
function ActivityFeedToggle({ onClick }: { onClick: () => void }) {
  const { unreadCount } = useActivityFeed();

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
      onClick={onClick}
      title="Activity Feed"
    >
      <Zap className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center font-bold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [feedOpen, setFeedOpen] = useState(false);

  return (
    <ActivityFeedProvider open={feedOpen}>
      <ActivityFeedToggle onClick={() => setFeedOpen((o) => !o)} />

      <ActivityFeedPanel open={feedOpen} onOpenChange={setFeedOpen} />

      {children}
    </ActivityFeedProvider>
  );
}
