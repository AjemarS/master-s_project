"use client";

import { useMemo } from "react";
import { ShoppingCart, ArrowRightLeft, ClipboardList, AlertCircle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import Link from "next/link";
import { useOrders, useStockMovements, useGoodsReceipts } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";

/* ── Types ─────────────────────────────────────────── */

interface ActivityItem {
  id: string;
  type: "order" | "movement" | "grn" | "alert";
  message: string;
  description: string;
  timestamp: string;
  link?: string;
}

interface ActivityFeedProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string, values?: Record<string, string | number | Date>) => string;
}

/* ── Event icon map ────────────────────────────────── */

const eventConfig = {
  order: { icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
  movement: { icon: ArrowRightLeft, color: "text-amber-500", bg: "bg-amber-500/10" },
  grn: { icon: ClipboardList, color: "text-chart-2", bg: "bg-chart-2/10" },
  alert: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
} as const;

/* ── Relative time helper ──────────────────────────── */

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diffMs = now - new Date(dateStr).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSeconds < 60) return "щойно";
  if (diffMinutes < 60) return `${diffMinutes} хв. тому`;
  if (diffHours < 24) return `${diffHours} год. тому`;
  if (diffDays < 7) return `${diffDays} дн. тому`;
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
  });
}

/* ── Component ─────────────────────────────────────── */

export default function ActivityFeed({ tSum, tc }: ActivityFeedProps) {
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useOrders(undefined, { refreshInterval: 15000 });
  const { data: movementsData, isLoading: movementsLoading, error: movementsError } = useStockMovements(undefined, { refreshInterval: 15000 });
  const { data: grnsData, isLoading: grnsLoading, error: grnsError } = useGoodsReceipts({ refreshInterval: 15000 });

  const isLoading = ordersLoading || movementsLoading || grnsLoading;
  const hasError = !!ordersError || !!movementsError || !!grnsError;

  const items = useMemo<ActivityItem[]>(() => {
    const result: ActivityItem[] = [];

    if (ordersData?.results) {
      for (const order of ordersData.results) {
        result.push({
          id: `order-${order.id}`,
          type: "order",
          message: `#${order.id} ${order.customer_name || ""}`.trim(),
          description: `${order.channel === "online" ? tc("online") : tc("offline")} · ${formatCurrency(order.total_amount)}`,
          timestamp: order.created_at,
          link: "/admin/orders",
        });
      }
    }

    if (movementsData?.results) {
      for (const m of movementsData.results) {
        result.push({
          id: `movement-${m.id}`,
          type: "movement",
          message: m.notes || "—",
          description: `${m.type} · ${m.quantity} од.`,
          timestamp: m.created_at,
          link: "/admin/stock-movements",
        });
      }
    }

    if (grnsData?.results) {
      for (const grn of grnsData.results) {
        result.push({
          id: `grn-${grn.id}`,
          type: "grn",
          message: grn.supplier_name,
          description: `${grn.items.length} товарів · ${formatCurrency(grn.total_amount)}`,
          timestamp: grn.receipt_date || grn.created_at || "",
          link: "/admin/goods-receipts",
        });
      }
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result.slice(0, 10);
  }, [ordersData, movementsData, grnsData, tc]);

  /* ── Error state ────────────────────────────────── */
  if (hasError && !isLoading && items.length === 0) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <Activity className="h-5 w-5 text-primary" />
            {tSum("activityFeed")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{tSum("activityError")}</p>
            <p className="text-xs text-muted-foreground mt-1">{tc("tryAgain")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <Activity className="h-5 w-5 text-primary" />
          {tSum("activityFeed")}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">{tSum("viewAllActivity")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* ── Loading skeleton ──────────────────────── */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded">
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/5 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-2/5 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────── */}
        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{tSum("noActivity")}</p>
          </div>
        )}

        {/* ── Item list ────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <div className="space-y-1">
            {items.map((item, index) => {
              const cfg = eventConfig[item.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="fade-slide-in flex items-center gap-3 p-2 rounded hover:bg-accent/5 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      {item.link ? (
                        <Link
                          href={item.link}
                          className="text-sm font-medium text-foreground hover:underline truncate block"
                        >
                          {item.message}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{item.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <style>{`
        .fade-slide-in {
          animation: fadeSlideIn 0.3s ease-out both;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Card>
  );
}
