"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";
import {
  CreditCard, ShoppingCart, AlertCircle, DollarSign,
  Clock, TrendingUp, LayoutDashboard, FileText,
} from "lucide-react";
import { StatsCardSkeleton } from "../components";
import { useOrders } from "~/lib/hooks/use-api-data";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";

export function CashierDashboard() {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");
  const { data: posOrdersData, isLoading: posOrdersLoading } = useOrders({ channel: "offline" });
  const { data: unpaidData, isLoading: unpaidLoading } = useOrders({ status: "unpaid" });

  const isLoading = posOrdersLoading || unpaidLoading;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const posOrdersToday = useMemo(() => {
    if (!posOrdersData?.results) return [];
    return posOrdersData.results.filter((o) => new Date(o.created_at) >= today);
  }, [posOrdersData, today]);

  const recentOrders = useMemo(() => posOrdersData?.results?.slice(0, 10) || [], [posOrdersData]);

  const [staleUnpaidCount, setStaleUnpaidCount] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => {
      setStaleUnpaidCount(
        unpaidData?.results
          ? unpaidData.results.filter((o) => new Date(o.created_at).getTime() < Date.now() - 3600000).length
          : 0
      );
    }, 0);
    return () => clearTimeout(id);
  }, [unpaidData]);

  const todayRevenue = posOrdersToday.reduce(
    (sum, o) => sum + Number(o.total_amount || 0), 0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <CreditCard className="h-10 w-10 text-emerald-600" />
              {tSum("cashierTitle")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{tSum("cashierSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <CreditCard className="h-10 w-10 text-emerald-600" />
            {tSum("cashierTitle")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{tSum("cashierSubtitle")}</p>
        </div>

        {staleUnpaidCount > 0 && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span>{staleUnpaidCount === 1 ? tSum("staleUnpaidOne", { count: staleUnpaidCount }) : tSum("staleUnpaid", { count: staleUnpaidCount })}</span>
              <Link href="/admin/orders?status=unpaid">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  {tc("view")}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("todaySales")}</CardTitle>
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{posOrdersToday.length}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {posOrdersToday.length > 0 ? tSum("completedCount", { count: posOrdersToday.filter(o => o.status === "completed" || o.status === "paid").length }) : tc("noData")}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("todayRevenueTitle")}</CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {todayRevenue.toLocaleString("uk-UA", { minimumFractionDigits: 0 })} ₴
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {posOrdersToday.length > 0 ? tSum("avgCheck", { amount: (todayRevenue / posOrdersToday.length).toFixed(0) }) : "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-amber-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("activeOrders")}</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {recentOrders.filter(o => o.status !== "completed" && o.status !== "cancelled").length}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tSum("staleUnpaidShort", { count: staleUnpaidCount })}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                {tSum("recentPosSales")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tSum("noPosSales")}</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((o) => (
                    <Link key={o.id} href="/admin/orders"
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">#{o.id}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {o.customer_name || tc("guest")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">₴{Number(o.total_amount || 0).toFixed(2)}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                <LayoutDashboard className="h-5 w-5 text-emerald-600" />
                {tSum("quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="default" className="w-full justify-start bg-emerald-600 hover:bg-emerald-700">
                <Link href="/admin/pos"><CreditCard className="h-4 w-4 mr-2" /> {tSum("openPos")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/orders"><ShoppingCart className="h-4 w-4 mr-2" /> {tSum("viewOrders")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/orders?status=unpaid"><FileText className="h-4 w-4 mr-2" /> {tSum("unpaidOrders")}</Link>
              </Button>
              {posOrdersToday.length > 0 && (
                <div className="mt-4 pt-4 border-t dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tSum("todaySummary", { count: posOrdersToday.length, amount: todayRevenue.toLocaleString("uk-UA", { minimumFractionDigits: 0 }) })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
