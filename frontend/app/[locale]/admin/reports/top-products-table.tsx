"use client";

import { useLocale, useTranslations } from "next-intl";
import { Download, Trophy } from "lucide-react";
import { downloadCsv } from "~/lib/utils/csv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";
import { formatCurrency } from "~/lib/utils/format";
import type { TopProduct, TopProductsSort } from "~/lib/types";

const SORTS: TopProductsSort[] = ["revenue", "quantity", "margin"];

interface TopProductsTableProps {
  products: TopProduct[];
  sort: TopProductsSort;
  onSortChange: (sort: TopProductsSort) => void;
  loading: boolean;
}

export function TopProductsTable({ products, sort, onSortChange, loading }: TopProductsTableProps) {
  const t = useTranslations("reports");
  const numberLocale = useLocale() === "en" ? "en-US" : "uk-UA";

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
            {t("topProducts")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">{t("topProductsDesc")}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("sortBy")}>
          {SORTS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === sort ? "secondary" : "ghost"}
              aria-pressed={s === sort}
              onClick={() => onSortChange(s)}
            >
              {t(`sort_${s}`)}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={!products.length}
            onClick={() =>
              downloadCsv(
                `top-products-${sort}`,
                [t("product"), t("unitsSold"), t("totalRevenue"), t("grossProfit"), t("marginPercent"), t("revenueShare")],
                products.map((p) => [p.product_name, p.quantity, p.revenue, p.margin, p.margin_percent, p.revenue_share])
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            {t("exportCsv")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={loading ? "opacity-60 transition-opacity" : undefined} aria-busy={loading}>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
        ) : (
          <div className="border rounded-lg dark:border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b dark:border-border">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead className="text-right">{t("unitsSold")}</TableHead>
                  <TableHead className="text-right">{t("totalRevenue")}</TableHead>
                  <TableHead className="text-right">{t("grossProfit")}</TableHead>
                  <TableHead className="text-right">{t("marginPercent")}</TableHead>
                  <TableHead className="text-right">{t("revenueShare")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, i) => (
                  <TableRow key={p.product_id}>
                    <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={p.product_name}>
                      {p.product_name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity.toLocaleString(numberLocale)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.margin)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.margin_percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden" aria-hidden>
                          <div className="h-full bg-primary" style={{ width: `${Math.min(p.revenue_share, 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-muted-foreground w-12">{p.revenue_share.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
