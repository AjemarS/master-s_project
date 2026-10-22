"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Archive, Download, Gauge, Hourglass, Package, RefreshCw } from "lucide-react";
import { downloadCsv } from "~/lib/utils/csv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";
import { useApiGet } from "~/lib/hooks/use-api";
import { productApi, stockApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import type { StockAnalytics, StockHealthRow } from "~/lib/types";

const WINDOWS = [30, 90, 180, 365] as const;
const LIST_SIZE = 15;
/** Sells out within this many days at the current pace: same threshold as summary.low_cover_products in inventory-service */
const LOW_COVER_DAYS = 14;

function Kpi({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function StockHealth() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "uk-UA";
  const [days, setDays] = useState<number>(90);

  const { data, error, isLoading } = useApiGet<StockAnalytics>(`/stock/analytics?${days}`, () => stockApi.analytics(days));

  const rows = data?.products ?? [];
  const dead = rows.filter((r) => r.dead).slice(0, LIST_SIZE);
  const lowCover = rows
    .filter((r) => r.days_of_cover !== null && r.days_of_cover < LOW_COVER_DAYS)
    .sort((a, b) => (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0))
    .slice(0, LIST_SIZE);

  // inventory-service knows ids only: one batched lookup for the names on screen
  const ids = [...new Set([...dead, ...lowCover].map((r) => r.product_id))].sort((a, b) => a - b);
  const { data: names } = useApiGet(
    ids.length ? `/products?ids=${ids.join(",")}` : null,
    () => productApi.getAll({ ids: ids.join(","), pageSize: 100 })
  );
  const nameOf = (id: number) => names?.results.find((p) => p.id === id)?.name ?? `#${id}`;

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(numberLocale, { day: "numeric", month: "short", year: "numeric" }) : t("never");

  const s = data?.summary;

  const table = (list: StockHealthRow[], kind: "dead" | "lowCover") => (
    <div className="border rounded-lg dark:border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b dark:border-border">
            <TableHead>{t("product")}</TableHead>
            <TableHead className="text-right">{t("onHand")}</TableHead>
            {kind === "dead" ? (
              <>
                <TableHead className="text-right">{t("stockValue")}</TableHead>
                <TableHead className="text-right">{t("lastSale")}</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-right">{t("avgDailySales")}</TableHead>
                <TableHead className="text-right">{t("daysOfCover")}</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.product_id}>
              <TableCell className="font-medium max-w-[16rem] truncate" title={nameOf(r.product_id)}>
                {nameOf(r.product_id)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.on_hand.toLocaleString(numberLocale)}</TableCell>
              {kind === "dead" ? (
                <>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatCurrency(r.stock_value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">{fmtDate(r.last_sale_at)}</TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-right tabular-nums">{r.avg_daily_sales.toLocaleString(numberLocale)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {t("daysCount", { count: Math.floor(r.days_of_cover ?? 0) })}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("analysisWindow")}</span>
        <div className="flex gap-1" role="group" aria-label={t("analysisWindow")}>
          {WINDOWS.map((w) => (
            <Button key={w} size="sm" variant={w === days ? "secondary" : "ghost"} aria-pressed={w === days} onClick={() => setDays(w)}>
              {t("lastDays", { count: w })}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              `stock-health-${days}d`,
              ["ID", t("product"), t("onHand"), t("stockValue"), t("unitsSold"), t("avgDailySales"), t("daysOfCover"), t("turnover"), t("lastSale"), t("deadStock")],
              rows.map((r) => [
                r.product_id, nameOf(r.product_id), r.on_hand, r.stock_value, r.units_sold, r.avg_daily_sales,
                r.days_of_cover, r.turnover, r.last_sale_at, r.dead ? "1" : "0",
              ])
            )
          }
        >
          <Download className="h-4 w-4" aria-hidden />
          {t("exportCsv")}
        </Button>
      </div>

      <ErrorAlert message={error?.message || null} />

      {isLoading && !data ? (
        <StatsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Package} label={t("inventoryValue")} value={formatCurrency(s?.stock_value ?? 0)} hint={t("atCost")} />
          <Kpi
            icon={RefreshCw}
            label={t("turnover")}
            value={s?.turnover != null ? `${s.turnover.toLocaleString(numberLocale)}×` : "—"}
            hint={t("turnoverHint", { days })}
          />
          <Kpi
            icon={Archive}
            label={t("deadStock")}
            value={formatCurrency(s?.dead_stock_value ?? 0)}
            hint={t("deadStockHint", { count: s?.dead_products ?? 0, share: (s?.dead_stock_share ?? 0).toFixed(1) })}
          />
          <Kpi icon={Hourglass} label={t("lowCover")} value={String(s?.low_cover_products ?? 0)} hint={t("lowCoverHint")} />
        </div>
      )}

      {/* One under the other: side by side, each table lost its last columns to scrolling */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" aria-hidden />
              {t("deadStock")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("deadStockDesc", { days })}</CardDescription>
          </CardHeader>
          <CardContent>
            {dead.length ? table(dead, "dead") : <p className="text-sm text-muted-foreground py-8 text-center">{t("noDeadStock")}</p>}
          </CardContent>
        </Card>

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" aria-hidden />
              {t("runningOut")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("runningOutDesc", { days: LOW_COVER_DAYS })}</CardDescription>
          </CardHeader>
          <CardContent>
            {lowCover.length ? table(lowCover, "lowCover") : <p className="text-sm text-muted-foreground py-8 text-center">{t("noRunningOut")}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
