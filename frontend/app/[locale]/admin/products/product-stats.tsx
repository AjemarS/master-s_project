"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "~/ui/primitives/card";

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
      <Card className="dark:bg-slate-800/80 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">{t("totalProducts")}</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-slate-800/80 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">{t("inStockCount")}</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-slate-800/80 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">{t("lowStockCount")}</div>
          <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-slate-800/80 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">{t("totalValue")}</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalValue.toFixed(2)} ₴</div>
        </CardContent>
      </Card>
    </div>
  );
}
