"use client";

import Link from "next/link";
import { Truck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { useGoodsReceipts } from "~/lib/hooks/use-api-data";
import { formatCurrency, formatRelativeTime } from "~/lib/utils/format";

interface SupplierSummary {
  id: number;
  name: string;
  totalItems: number;
  totalValue: number;
  lastDelivery: string;
  deliveryCount: number;
}

function daysSinceDelivery(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function deliveryStatusColor(dateStr: string): string {
  const days = daysSinceDelivery(dateStr);
  if (days < 7) return "bg-green-500";
  if (days < 30) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

interface SupplierPerformanceCardProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function SupplierPerformanceCard({ tSum }: SupplierPerformanceCardProps) {
  const { data, isLoading } = useGoodsReceipts();

  if (isLoading) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <Truck className="h-5 w-5 text-primary" />
            {tSum("supplierPerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const grns = data?.results || [];
  const supplierMap = new Map<number, SupplierSummary>();

  for (const grn of grns) {
    const existing = supplierMap.get(grn.supplier);
    if (existing) {
      existing.totalItems += grn.items.reduce((s, i) => s + i.quantity, 0);
      existing.totalValue += grn.total_amount;
      existing.deliveryCount += 1;
      if (new Date(grn.receipt_date) > new Date(existing.lastDelivery)) {
        existing.lastDelivery = grn.receipt_date;
      }
    } else {
      supplierMap.set(grn.supplier, {
        id: grn.supplier,
        name: grn.supplier_name,
        totalItems: grn.items.reduce((s, i) => s + i.quantity, 0),
        totalValue: grn.total_amount,
        lastDelivery: grn.receipt_date,
        deliveryCount: 1,
      });
    }
  }

  const suppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  if (suppliers.length === 0) {
    return (
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <Truck className="h-5 w-5 text-primary" />
            {tSum("supplierPerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">{tSum("noSuppliers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <Truck className="h-5 w-5 text-primary" />
            {tSum("supplierPerformance")}
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/suppliers">{tSum("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suppliers.map((s) => {
            return (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${deliveryStatusColor(s.lastDelivery)}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(s.lastDelivery)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(s.totalValue)}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.totalItems} {tSum("units_short", { count: s.totalItems })} · {s.deliveryCount} {tSum("deliveries_short", { count: s.deliveryCount })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
