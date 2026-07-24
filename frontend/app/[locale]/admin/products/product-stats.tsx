"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "~/ui/primitives/card";
import { formatCurrency } from "~/lib/utils/format";

interface ProductStatsCardsProps {
  stats: {
    total: number;
    active: number;
    lowStock: number;
    totalValue: number;
  };
}

export function ProductStatsCards({ stats }: ProductStatsCardsProps) {
  const t = useTranslations("products");

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="dark:bg-card dark:border-border">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">{t("totalProducts")}</div>
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-card dark:border-border">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">{t("inStockCount")}</div>
          <div className="text-3xl font-bold text-primary">{stats.active}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-card dark:border-border">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">{t("lowStockCount")}</div>
          <div className="text-3xl font-bold text-accent-electric">{stats.lowStock}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-card dark:border-border">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">{t("totalValue")}</div>
          <div className="text-3xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
