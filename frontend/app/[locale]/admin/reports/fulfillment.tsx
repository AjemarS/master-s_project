"use client";

import { useLocale, useTranslations } from "next-intl";
import { Filter, Timer, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import type { FulfillmentReport } from "~/lib/types";

export function Fulfillment({ from, to }: { from?: string; to?: string }) {
  const t = useTranslations("reports");
  const ts = useTranslations("orders");
  const numberLocale = useLocale() === "en" ? "en-US" : "uk-UA";
  const { data, error, isLoading } = useApiGet<FulfillmentReport>(`/reports/fulfillment?${from}|${to}`, () =>
    reportApi.fulfillment(from, to)
  );

  /** 30 min / 5.5 h / 2.3 d: whichever reads naturally */
  const duration = (hours: number | null) => {
    if (hours === null) return "—";
    if (hours < 1) return t("minutesShort", { count: Math.round(hours * 60) });
    if (hours < 48) return t("hoursShort", { count: hours.toLocaleString(numberLocale, { maximumFractionDigits: 1 }) });
    return t("daysShort", { count: (hours / 24).toLocaleString(numberLocale, { maximumFractionDigits: 1 }) });
  };

  if (isLoading && !data) return <StatsGridSkeleton count={3} />;

  const total = data?.orders ?? 0;

  return (
    <div className="space-y-6">
      <ErrorAlert message={error?.message || null} />

      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" aria-hidden />
            {t("funnel")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("funnelDesc", { count: total, conversion: (data?.payment_conversion ?? 0).toFixed(1) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noOnlineOrders")}</p>
          ) : (
            <ol className="space-y-3">
              {data?.funnel.map((step) => {
                const share = total ? (step.count / total) * 100 : 0;
                return (
                  <li key={step.stage} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm">
                    <span className="text-muted-foreground truncate">
                      {step.stage === "unpaid" ? t("stageCreated") : ts(step.stage)}
                    </span>
                    <div className="h-6 rounded bg-muted overflow-hidden" aria-hidden>
                      <div className="h-full rounded bg-primary/80" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-right tabular-nums">
                      {step.count.toLocaleString(numberLocale)}{" "}
                      <span className="text-muted-foreground">({share.toFixed(0)}%)</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" aria-hidden />
              {t("stageDurations")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("stageDurationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg dark:border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b dark:border-border">
                    <TableHead>{t("stage")}</TableHead>
                    <TableHead className="text-right">{t("median")}</TableHead>
                    <TableHead className="text-right">{t("average")}</TableHead>
                    <TableHead className="text-right">{t("ordersShort")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.durations.map((d) => (
                    <TableRow key={`${d.from}-${d.to}`}>
                      <TableCell className="font-medium">
                        {d.from === "unpaid" ? t("stageCreated") : ts(d.from)} → {ts(d.to)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{duration(d.median_hours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{duration(d.avg_hours)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{d.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <XCircle className="h-5 w-5 text-primary" aria-hidden />
              {t("cancellationsByStage")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("cancelledOrders", { count: data?.cancelled.total ?? 0 })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data &&
                Object.entries(data.cancelled.by_stage).map(([stage, n]) => (
                  <li key={stage} className="flex justify-between border-b last:border-0 pb-2 dark:border-border">
                    <span className="text-muted-foreground">
                      {t("cancelledAt", { stage: stage === "unpaid" ? t("stageCreated") : ts(stage) })}
                    </span>
                    <span className="tabular-nums font-medium">{n}</span>
                  </li>
                ))}
              {!!data?.cancelled.unknown_stage && (
                <li className="flex justify-between text-muted-foreground">
                  <span>{t("cancelledUnknown")}</span>
                  <span className="tabular-nums">{data.cancelled.unknown_stage}</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
