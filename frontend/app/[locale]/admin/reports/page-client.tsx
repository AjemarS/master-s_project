"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { toast } from "sonner";
import { TrendingUp, DollarSign, BarChart3, PieChart, ShoppingCart, Package, Calendar } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, RevenueReport } from "~/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { formatCurrency } from "~/lib/utils/format";
import { PieChart as RechartPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

export function ReportsClient() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [dateInput, setDateInput] = useState({ from: "", to: "" });
  const [appliedFilter, setAppliedFilter] = useState({ from: "", to: "" });

  const dateRangeError = dateInput.from && dateInput.to && dateInput.from > dateInput.to;

  const handleApplyFilter = () => {
    if (dateRangeError) {
      toast.error("Date from cannot be after date to");
      return;
    }
    setAppliedFilter({ from: dateInput.from, to: dateInput.to });
  };

  const filterKey = `${appliedFilter.from}|${appliedFilter.to}`;

  const { data: sales, error: salesErr, isLoading: salesLoading } = useApiGet<SalesReport>(
    `/reports/sales?${filterKey}`,
    () => reportApi.sales(appliedFilter.from || undefined, appliedFilter.to || undefined)
  );

  const { data: revenue, error: revErr, isLoading: revLoading } = useApiGet<RevenueReport>(
    `/reports/revenue?${filterKey}`,
    () => reportApi.revenue(appliedFilter.from || undefined, appliedFilter.to || undefined)
  );

  const { data: inventoryValue, error: invErr, isLoading: invLoading } = useApiGet<{ total_value: string; item_count: number }>(
    "/reports/inventory-value",
    () => reportApi.inventoryValue()
  );

  const { data: dailySales, error: dailyErr, isLoading: dailyLoading } = useApiGet<{ daily: { date: string; revenue: number; orders: number }[] }>(
    "/reports/daily-sales",
    () => reportApi.dailySales()
  );

  const loading = salesLoading || revLoading || invLoading || dailyLoading;
  const error = salesErr || revErr || invErr || dailyErr || null;

  const dailySalesData = dailySales?.daily ?? [];

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={BarChart3}
          backLabel={tc("back")}
        />

        <ErrorAlert message={error?.message || null} />

        {loading ? (
          <StatsGridSkeleton count={5} />
        ) : (
          <div className="space-y-6">
            {/* Date range */}
            <Card className="dark:bg-card dark:border-border">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">{t("dateFrom")}</Label>
                    <Input type="date" value={dateInput.from} onChange={(e) => setDateInput((prev) => ({ ...prev, from: e.target.value }))} className={`w-40 ${dateRangeError ? "border-red-500" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t("dateTo")}</Label>
                    <Input type="date" value={dateInput.to} onChange={(e) => setDateInput((prev) => ({ ...prev, to: e.target.value }))} className={`w-40 ${dateRangeError ? "border-red-500" : ""}`} />
                  </div>
                  <Button size="sm" onClick={handleApplyFilter}>
                    {t("update")}
                  </Button>
                  {(dateInput.from || dateInput.to) && (
                    <Button size="sm" variant="outline" onClick={() => { setDateInput({ from: "", to: "" }); setAppliedFilter({ from: "", to: "" }); }}>
                      {t("reset")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString(locale)} ₴`} />
                      <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Margin trend (line chart) */}
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
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="orders" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

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
                    <CardDescription className="text-muted-foreground">{t("channelDistribution")}</CardDescription>
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
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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
          </div>
        )}
      </div>
    </div>
  );
}
