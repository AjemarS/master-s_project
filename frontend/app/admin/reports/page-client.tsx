"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, TrendingUp, DollarSign, Package, BarChart3, PieChart } from "lucide-react";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, RevenueReport } from "~/lib/types";

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const sr = sales;
  const rr = revenue;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Всього замовлень
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sr?.total_orders ?? rr?.order_count ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Загальний дохід
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(rr?.total_revenue ?? sr?.total_revenue ?? 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-600" />
              Загальна собівартість
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(rr?.total_cost ?? sr?.total_cost ?? 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Валовий прибуток
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatCurrency(rr?.gross_margin ?? sr?.total_margin ?? 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" />
              Маржа %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {Number(rr?.margin_percent ?? sr?.margin_percent ?? 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {sr?.by_channel && sr.by_channel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Розподіл за каналами</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Канал</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Кількість замовлень</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Дохід</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.by_channel.map((ch, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <Badge variant={ch.channel === "online" ? "default" : "secondary"}>
                          {ch.channel === "online" ? "Онлайн" : "Офлайн"}
                        </Badge>
                      </td>
                      <td className="p-4">{ch.count}</td>
                      <td className="p-4 font-semibold">{formatCurrency(ch.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
