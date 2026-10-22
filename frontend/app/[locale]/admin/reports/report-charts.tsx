"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { formatCurrency } from "~/lib/utils/format";
import {
  PieChart as RechartPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Button } from "~/ui/primitives/button";
import { Download } from "lucide-react";
import { downloadCsv } from "~/lib/utils/csv";
import type { SalesGroup, SalesReport } from "~/lib/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const GROUPS: SalesGroup[] = ["day", "week", "month"];

interface ReportChartsProps {
  series: { date: string; revenue: number; orders: number }[];
  group: SalesGroup;
  onGroupChange: (group: SalesGroup) => void;
  loading: boolean;
  sales: SalesReport | undefined;
  locale: string;
}

export function ReportCharts({ series: dailySalesData, group, onGroupChange, loading, sales, locale }: ReportChartsProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const dateLocale = locale === "en" ? "en-US" : "uk-UA";
  // Bucket dates are plain YYYY-MM-DD: parse as local midnight, not UTC
  const tick = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(
      dateLocale,
      group === "month" ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" }
    );

  return (
    <>
      <Card className="dark:bg-card dark:border-border">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="text-foreground">{t("revenueDynamics")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t(`revenueBy_${group}`)}</CardDescription>
          </div>
          <div className="flex gap-1" role="group" aria-label={t("groupBy")}>
            {GROUPS.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={g === group ? "secondary" : "ghost"}
                aria-pressed={g === group}
                onClick={() => onGroupChange(g)}
              >
                {t(`group_${g}`)}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={!dailySalesData.length}
              onClick={() =>
                downloadCsv(
                  `sales-by-${group}`,
                  [t("period"), t("totalRevenue"), t("totalOrders")],
                  dailySalesData.map((d) => [d.date, d.revenue, d.orders])
                )
              }
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={loading ? "opacity-60 transition-opacity" : undefined} aria-busy={loading}>
          {dailySalesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t("noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={tick} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(d) => tick(String(d))} formatter={(v) => [formatCurrency(Number(v || 0)), t("totalRevenue")]} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {dailySalesData.length > 0 && (
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("ordersDynamics")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t(`ordersBy_${group}`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={tick} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => tick(String(d))} formatter={(v) => [v, t("totalOrders")]} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Channel distribution table + pie chart */}
      {sales?.by_channel && sales.by_channel.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <CardTitle className="text-foreground">{t("channelDistribution")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("channelDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg dark:border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b dark:border-border">
                      <TableHead>{tc("channel")}</TableHead>
                      <TableHead>{t("totalOrders")}</TableHead>
                      <TableHead>{t("totalRevenue")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.by_channel.map((ch, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {ch.channel === "online" ? tc("online") : tc("offline")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{ch.count}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(ch.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <CardTitle className="text-foreground">{t("revenueByChannel")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("channelDistribution")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RechartPie>
                  <Pie
                    data={sales.by_channel.map((ch) => ({
                      name: ch.channel === "online" ? tc("online") : tc("offline"),
                      value: ch.revenue,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {sales.by_channel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                  <Legend />
                </RechartPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
