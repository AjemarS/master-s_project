"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";

interface LastUpdatedProps {
  /** Timestamp of last data refresh. If omitted, component shows current time on mount. */
  timestamp?: Date;
  /** Optional label prefix (default: "Last updated") */
  label?: string;
  /** Whether to show a loading skeleton instead */
  loading?: boolean;
}

export function LastUpdated({ timestamp, label, loading }: LastUpdatedProps) {
  const tc = useTranslations("common");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="h-3 w-3 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    );
  }

  const displayTime = timestamp ?? now;
  const timeStr = displayTime.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={displayTime.toLocaleString()}>
      <Clock className="h-3 w-3" />
      <span>{label ?? tc("lastUpdated", { time: timeStr })}</span>
    </div>
  );
}
