"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, TrendingUp, DollarSign, BarChart3, PieChart, ArrowLeft, ShoppingCart, Package, Calendar } from "lucide-react";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, RevenueReport } from "~/lib/types";
import { StatsGridSkeleton } from "../components";
import { PieChart as RechartPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

export function ReportsClient() {
  const tRep = useTranslations("reports");
  const tCommon = useTranslations("common");
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [inventoryValue, setInventoryValue] = useState<{ total_value: number; item_count: number } | null>(null);
  const [dailySales, setDailySales] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReports = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const [salesRes, revenueRes, invRes, dailyRes] = await Promise.all([
        reportApi.sales(from, to), reportApi.revenue(from, to), reportApi.inventoryValue(), reportApi.dailySales(),
      ]);
      if (salesRes.error) throw new Error(salesRes.error.message);
      if (revenueRes.error) throw new Error(revenueRes.error.message);
      setSales(salesRes.data ?? null);
      setRevenue(revenueRes.data ?? null);
      if (invRes.data) {
        setInventoryValue({
          total_value: Number(invRes.data.total_value),
          item_count: invRes.data.item_count,
        });
      }
      if (dailyRes.data?.daily) setDailySales(dailyRes.data.daily);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => fetchReports());
  }, []);

  const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#3b82f6"];
  const formatCurrency = (val: number) => `${Number(val).toFixed(2)} ₴`;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              На головну
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <BarChart3 className="h-10 w-10 text-purple-600" />
                Звіти
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Аналітика продажів, виручки та маржинальності</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <StatsGridSkeleton count={5} />
        ) : (
          <div className="space-y-6">
            {/* Date range */}
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <Label className="text-xs text-slate-500">Від</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500">До</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                  </div>
                  <Button size="sm" onClick={() => fetchReports(dateFrom || undefined, dateTo || undefined)}>
                    Оновити
                  </Button>
                  {(dateFrom || dateTo) && (
                    <Button size="sm" variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); fetchReports(); }}>
                      Скинути
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    Всього замовлень
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {sales?.total_orders ?? revenue?.order_count ?? 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Загальний дохід
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(revenue?.total_revenue ?? sales?.total_revenue ?? 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-600" />
                    Собівартість
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {formatCurrency(revenue?.total_cost ?? sales?.total_cost ?? 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Валовий прибуток
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency(revenue?.gross_margin ?? sales?.total_margin ?? 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-emerald-600" />
                    Маржа %
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    {Number(revenue?.margin_percent ?? sales?.margin_percent ?? 0).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-800/80 dark:border-slate-700 border-l-4 border-l-cyan-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-600" />
                    Вартість запасів
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-cyan-600">
                    {formatCurrency(inventoryValue?.total_value ?? 0)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {inventoryValue?.item_count ?? 0} позицій
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue over time (bar chart) */}
            {dailySales.length > 0 && (
              <Card className="dark:bg-slate-800/80 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">Дохід за 30 днів</CardTitle>
                  <CardDescription className="dark:text-slate-400">Щоденна виручка</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString("uk-UA")} ₴`} />
                      <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Margin trend (line chart) */}
            {dailySales.length > 0 && (
              <Card className="dark:bg-slate-800/80 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">Кількість замовлень</CardTitle>
                  <CardDescription className="dark:text-slate-400">Щоденна кількість замовлень</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {sales?.by_channel && sales.by_channel.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Розподіл за каналами</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Онлайн vs офлайн продажі
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Канал</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Замовлень</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дохід</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.by_channel.map((ch, i) => (
                            <tr key={i} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-4 font-medium text-slate-900 dark:text-slate-200">
                                {ch.channel === "online" ? "Онлайн" : "Офлайн (POS)"}
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-400">{ch.count}</td>
                              <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(ch.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-800/80 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Дохід за каналами</CardTitle>
                    <CardDescription className="dark:text-slate-400">Розподіл виручки</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <RechartPie>
                        <Pie
                          data={sales.by_channel.map((ch) => ({
                            name: ch.channel === "online" ? "Онлайн" : "POS",
                            value: ch.revenue,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {sales.by_channel.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
