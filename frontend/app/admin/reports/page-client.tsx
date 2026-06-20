"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, TrendingUp, DollarSign, BarChart3, PieChart, ArrowLeft, ShoppingCart } from "lucide-react";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, RevenueReport } from "~/lib/types";
import { StatsCardSkeleton } from "../components";

export function ReportsClient() {
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [salesRes, revenueRes] = await Promise.all([reportApi.sales(), reportApi.revenue()]);
        if (salesRes.error) throw new Error(salesRes.error.message);
        if (revenueRes.error) throw new Error(revenueRes.error.message);
        setSales(salesRes.data ?? null);
        setRevenue(revenueRes.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

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
          <StatsCardSkeleton count={5} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            </div>

            {sales?.by_channel && sales.by_channel.length > 0 && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
