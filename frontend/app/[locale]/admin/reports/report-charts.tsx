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
import type { SalesReport } from "~/lib/types";

interface ReportChartsProps {
  dailySalesData: { date: string; revenue: number; orders: number }[];
  sales: SalesReport | undefined;
  locale: string;
  COLORS: string[];
}

export function ReportCharts({ dailySalesData, sales, locale, COLORS }: ReportChartsProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");

  return (
    <>
      {/* Revenue over time (bar chart) */}
      {dailySalesData.length > 0 && (
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("revenue30days")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("dailyRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString(locale)} ₴`} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Orders trend (line chart) */}
      {dailySalesData.length > 0 && (
        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("dailyOrders")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("dailyOrders")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
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
