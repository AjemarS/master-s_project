"use client";

import { Bell, Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "~/lib/cn";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { CardFooter } from "~/ui/primitives/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/primitives/dropdown-menu";

import { Notifications } from "./notifications";

export interface Notification {
  description: string;
  id: string;
  read: boolean;
  timestamp: Date;
  title: string;
  type: "error" | "info" | "success" | "warning";
}

type NotificationCenterProps = React.HTMLAttributes<HTMLDivElement> & {
  notifications: Notification[];
  unreadCount?: number;
  loading?: boolean;
  onClearAll?: () => void;
  onDismiss?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
};

export function NotificationCenter({
  className,
  notifications,
  unreadCount: unreadCountProp,
  loading = false,
  onClearAll,
  onDismiss,
  onMarkAllAsRead,
  onMarkAsRead,
  ...props
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("notifications");
  // Use prop if provided, otherwise compute from loaded notifications
  const unreadCount = unreadCountProp ?? notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => onMarkAsRead?.(id);
  const handleMarkAllAsRead = () => onMarkAllAsRead?.();
  const handleDismiss = (id: string) => onDismiss?.(id);
  const handleClearAll = () => onClearAll?.();

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("title")}
            className="relative h-9 w-9 rounded-full"
            size="icon"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {!loading && unreadCount > 0 && (
              <Badge
                className={`
                  absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px]
                `}
                variant="destructive"
              >
                {unreadCount > 99 ? "99+" : String(unreadCount)}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>{t("title")}</span>
            {unreadCount > 0 && (
              <Button
                className="h-auto p-0 text-xs font-normal text-accent-electric"
                onClick={handleMarkAllAsRead}
                size="sm"
                variant="ghost"
              >
                {t("markAllAsRead")}
              </Button>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Notifications
              notifications={notifications}
              onDismiss={handleDismiss}
              onMarkAsRead={handleMarkAsRead}
            />
          )}

          {!loading && notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <CardFooter className="p-2">
                <Button
                  className="w-full"
                  onClick={handleClearAll}
                  size="sm"
                  variant="outline"
                >
                  {t("clearAll")}
                </Button>
              </CardFooter>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
