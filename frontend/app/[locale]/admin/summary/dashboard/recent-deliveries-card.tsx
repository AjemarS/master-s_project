"use client";

import Link from "next/link";
import { ClipboardList, Building2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { useGoodsReceipts } from "~/lib/hooks/use-api-data";
import { formatCurrency, formatRelativeTime } from "~/lib/utils/format";

interface RecentDeliveriesCardProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function RecentDeliveriesCard({ tSum }: RecentDeliveriesCardProps) {
  const { data, isLoading } = useGoodsReceipts();

  if (isLoading) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {tSum("recentDeliveries")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const grns = (data?.results || [])
    .sort((a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())
    .slice(0, 5);

  if (grns.length === 0) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {tSum("recentDeliveries")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">{tSum("noDeliveries")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            {tSum("recentDeliveries")}
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/goods-receipts">{tSum("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {grns.map((grn) => {
            const itemCount = grn.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Link
                key={grn.id}
                href="/admin/goods-receipts"
                className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{grn.supplier_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      {grn.warehouse_name}
                      <Package className="h-3 w-3 ml-1" />
                      {tSum("units_short", { count: itemCount })}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(grn.total_amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(grn.receipt_date)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
