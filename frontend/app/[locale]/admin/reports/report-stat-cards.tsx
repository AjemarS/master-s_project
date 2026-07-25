"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { TrendingUp, DollarSign, BarChart3, PieChart, ShoppingCart, Package } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import type { SalesReport, RevenueReport } from "~/lib/types";

interface ReportStatCardsProps {
  sales: SalesReport | undefined;
  revenue: RevenueReport | undefined;
  inventoryValue: { total_value: string; item_count: number } | undefined;
}

export function ReportStatCards({ sales, revenue, inventoryValue }: ReportStatCardsProps) {
  const t = useTranslations("reports");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <Card className="dark:bg-card dark:border-border border-t-4 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            {t("totalOrders")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {sales?.total_orders ?? revenue?.order_count ?? 0}
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-card dark:border-border border-t-4 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {t("totalRevenue")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(revenue?.total_revenue ?? sales?.total_revenue ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-card dark:border-border border-t-4 border-t-accent-electric">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-electric" />
            {t("totalCost")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-accent-electric">
            {formatCurrency(revenue?.total_cost ?? sales?.total_cost ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-card dark:border-border border-t-4 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("grossProfit")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(revenue?.gross_margin ?? sales?.total_margin ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-card dark:border-border border-t-4 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            {t("marginPercent")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {Number(revenue?.margin_percent ?? sales?.margin_percent ?? 0).toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-card dark:border-border border-t-4 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {t("inventoryValue")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(inventoryValue?.total_value ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("inventoryItems", { count: inventoryValue?.item_count ?? 0 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
