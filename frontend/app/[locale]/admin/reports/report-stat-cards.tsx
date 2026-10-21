"use client";

import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, DollarSign, PieChart, ShoppingCart, Package, Receipt, XCircle, Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { formatCurrency } from "~/lib/utils/format";
import { cn } from "~/lib/cn";
import type { SalesKpis, SalesReport } from "~/lib/types";

interface ReportStatCardsProps {
  sales: SalesReport | undefined;
  inventoryValue: { total_value: number; item_count: number } | undefined;
}

type Metric = {
  key: keyof SalesKpis;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string;
  /** Percent metrics compare in percentage points, the rest in relative % */
  points?: boolean;
  /** true when a rise is bad news (costs, cancellations) */
  inverse?: boolean;
};

function Delta({ current, previous, points, inverse }: { current: number; previous: number; points?: boolean; inverse?: boolean }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  if (!points && previous === 0) {
    return <p className="text-xs text-muted-foreground mt-1">{current === 0 ? "—" : t("newVsPrevious")}</p>;
  }
  const diff = points ? current - previous : ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const good = inverse ? rounded < 0 : rounded > 0;
  const text = `${rounded > 0 ? "+" : ""}${rounded.toLocaleString(locale === "en" ? "en-US" : "uk-UA")}${points ? ` ${t("pp")}` : "%"}`;
  return (
    <p className="text-xs mt-1 text-muted-foreground">
      <span
        className={cn(
          "font-medium",
          rounded === 0 ? "text-muted-foreground" : good ? "text-green-600 dark:text-green-400" : "text-destructive"
        )}
      >
        {rounded > 0 ? "▲" : rounded < 0 ? "▼" : "•"} {text}
      </span>{" "}
      {t("vsPrevious")}
    </p>
  );
}

export function ReportStatCards({ sales, inventoryValue }: ReportStatCardsProps) {
  const t = useTranslations("reports");
  const locale = useLocale();
  // Reports are in UAH whatever the UI language, so no USD conversion here
  const money = (v: number) => formatCurrency(v);
  const percent = (v: number) => `${Number(v).toFixed(1)}%`;
  const count = (v: number) => v.toLocaleString(locale === "en" ? "en-US" : "uk-UA");

  const metrics: Metric[] = [
    { key: "total_revenue", label: t("totalRevenue"), icon: DollarSign, format: money },
    { key: "total_orders", label: t("totalOrders"), icon: ShoppingCart, format: count },
    { key: "average_order_value", label: t("averageOrderValue"), icon: Receipt, format: money },
    { key: "total_quantity", label: t("unitsSold"), icon: Boxes, format: count },
    { key: "total_margin", label: t("grossProfit"), icon: TrendingUp, format: money },
    { key: "margin_percent", label: t("marginPercent"), icon: PieChart, format: percent, points: true },
    { key: "cancellation_rate", label: t("cancellationRate"), icon: XCircle, format: percent, points: true, inverse: true },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(({ key, label, icon: Icon, format, points, inverse }) => (
        <Card key={key} className="dark:bg-card dark:border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tabular-nums">{format(sales?.[key] ?? 0)}</div>
            {sales?.previous && (
              <Delta current={sales[key]} previous={sales.previous[key]} points={points} inverse={inverse} />
            )}
            {key === "cancellation_rate" && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("cancelledOrders", { count: sales?.cancelled_orders ?? 0 })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="dark:bg-card dark:border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" aria-hidden />
            {t("inventoryValue")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground tabular-nums">{money(inventoryValue?.total_value ?? 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("inventoryItems", { count: inventoryValue?.item_count ?? 0 })} · {t("atCost")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
