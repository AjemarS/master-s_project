"use client";

import { useLocale, useTranslations } from "next-intl";
import { Download, Layers } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { downloadCsv } from "~/lib/utils/csv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import type { AbcClass, AbcReport } from "~/lib/types";

const CLASSES: AbcClass[] = ["A", "B", "C"];
const CLASS_COLOR: Record<AbcClass, string> = {
  A: "var(--chart-1)",
  B: "var(--chart-2)",
  C: "var(--chart-3)",
};

export function AbcAnalysis({ from, to }: { from?: string; to?: string }) {
  const t = useTranslations("reports");
  const numberLocale = useLocale() === "en" ? "en-US" : "uk-UA";
  const { data, error, isLoading } = useApiGet<AbcReport>(`/reports/abc?${from}|${to}`, () => reportApi.abc(from, to));

  const products = data?.products ?? [];

  return (
    <div className="space-y-6">
      <ErrorAlert message={error?.message || null} />

      {isLoading && !data ? (
        <StatsGridSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLASSES.map((cls) => {
            const c = data?.classes[cls];
            return (
              <Card key={cls} className="dark:bg-card dark:border-border border-t-4" style={{ borderTopColor: CLASS_COLOR[cls] }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t(`abc_${cls}`)}</CardTitle>
                  <CardDescription className="text-xs">{t(`abcHint_${cls}`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {t("productsCount", { count: c?.products ?? 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(c?.revenue ?? 0)} · {(c?.revenue_share ?? 0).toFixed(1)}% {t("ofRevenue")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Share of products vs share of revenue: the Pareto picture in one bar */}
      {products.length > 0 && data && (
        <Card className="dark:bg-card dark:border-border">
          <CardContent className="pt-6 space-y-3">
            {(["products", "revenue_share"] as const).map((metric) => (
              <div key={metric} className="space-y-1">
                <div className="text-xs text-muted-foreground">{t(metric === "products" ? "shareOfProducts" : "shareOfRevenue")}</div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted" role="img"
                  aria-label={CLASSES.map((cls) => {
                    const v = metric === "products" ? (data.classes[cls].products / products.length) * 100 : data.classes[cls].revenue_share;
                    return `${cls}: ${v.toFixed(0)}%`;
                  }).join(", ")}
                >
                  {CLASSES.map((cls) => {
                    const v = metric === "products" ? (data.classes[cls].products / products.length) * 100 : data.classes[cls].revenue_share;
                    return <div key={cls} style={{ width: `${v}%`, background: CLASS_COLOR[cls] }} title={`${cls}: ${v.toFixed(1)}%`} />;
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-card dark:border-border">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" aria-hidden />
              {t("abcTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("abcDesc")}</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!products.length}
            onClick={() =>
              downloadCsv(
                `abc-${from ?? "all"}-${to ?? "all"}`,
                [t("abcClass"), t("product"), t("unitsSold"), t("totalRevenue"), t("revenueShare"), t("cumulativeShare")],
                products.map((p) => [p.abc_class, p.product_name, p.quantity, p.revenue, p.revenue_share, p.cumulative_share])
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            {t("exportCsv")}
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
          ) : (
            <div className="border rounded-lg dark:border-border overflow-x-auto max-h-[32rem] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow className="bg-muted/50 border-b dark:border-border">
                    <TableHead className="w-16">{t("abcClass")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead className="text-right">{t("unitsSold")}</TableHead>
                    <TableHead className="text-right">{t("totalRevenue")}</TableHead>
                    <TableHead className="text-right">{t("revenueShare")}</TableHead>
                    <TableHead className="text-right">{t("cumulativeShare")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.product_id}>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: CLASS_COLOR[p.abc_class] }}>{p.abc_class}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={p.product_name}>{p.product_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantity.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.revenue_share.toFixed(1)}%</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.cumulative_share.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
