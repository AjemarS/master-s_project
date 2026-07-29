"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";

interface RecentOrder {
  id: number;
  customer_name?: string;
  channel?: string;
  total_amount: number;
  status: string;
}

interface RecentOrdersCardProps {
  orders: RecentOrder[];
  isLoading: boolean;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string, values?: Record<string, string | number | Date>) => string;
  formatCurrency: (v: number) => string;
}

export default function RecentOrdersCard({
  orders,
  isLoading,
  tSum,
  tc,
  formatCurrency,
}: RecentOrdersCardProps) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {tSum("recentOrders")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{tSum("noOrders")}</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href="/admin/orders"
                className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-foreground">#{o.id}</span>
                  <span className="text-sm text-muted-foreground">
                    {o.customer_name || "—"} · {o.channel === "online" ? tc("online") : tc("offline")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{formatCurrency(o.total_amount)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
