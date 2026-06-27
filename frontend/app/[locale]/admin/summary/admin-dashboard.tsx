"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Users, Package, TrendingUp, AlertCircle,
  CheckCircle, XCircle, LayoutDashboard, BarChart3,
  ShoppingCart, Warehouse, CreditCard, Truck, ClipboardList,
  DollarSign, Clock, PlusCircle, FileText,
} from "lucide-react";
import { authClient, useCurrentUser, User } from "~/lib/auth-client";
import { UserWithRole } from "better-auth/plugins/admin";
import type { Product, RevenueReport, SalesReport } from "~/lib/types";
import { StatsCardSkeleton } from "../components";
import { useRecentProducts } from "~/lib/hooks/use-recent-products";
import { useOrders, useWarehouses, useStock } from "~/lib/hooks/use-api-data";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { ErrorAlert } from "~/ui/components/error-alert";
import { formatCurrency } from "~/lib/utils/format";
import { PieChart as RechartPie, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type AdminUserData = UserWithRole & Pick<User, "status">;

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  lowStock: number;
  recentUsersCount: number;
  productsValue: number;
}

interface AdminDashboardProps {
  initialProducts: Product[];
}

const NAV_ITEMS = [
  { key: "products", href: "/admin/products", icon: Package, color: "text-purple-600" },
  { key: "orders", href: "/admin/orders", icon: ShoppingCart, color: "text-blue-600" },
  { key: "pos", href: "/admin/pos", icon: CreditCard, color: "text-emerald-600" },
  { key: "warehouses", href: "/admin/warehouses", icon: Warehouse, color: "text-orange-600" },
  { key: "suppliers", href: "/admin/suppliers", icon: Truck, color: "text-sky-600" },
  { key: "goodsReceipts", href: "/admin/goods-receipts", icon: ClipboardList, color: "text-rose-600" },
  { key: "reports", href: "/admin/reports", icon: BarChart3, color: "text-violet-600" },
  { key: "users", href: "/admin/users", icon: Users, color: "text-cyan-600" },
];

export function AdminDashboard({ initialProducts }: AdminDashboardProps) {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");
  const tNav = useTranslations("nav");
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const isWhWorker = user?.role === "warehouse_worker";
  const { recentProducts, clearRecent } = useRecentProducts();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: initialProducts.length,
    lowStock: initialProducts.filter((p) => p.stock < 10).length,
    recentUsersCount: 0,
    productsValue: initialProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#3b82f6"];

  interface ServiceHealth {
    status: "healthy" | "unhealthy" | "loading";
    label: string;
  }

  const [services, setServices] = useState<Record<string, ServiceHealth>>({
    product: { status: "loading", label: "Product" },
    inventory: { status: "loading", label: "Inventory" },
    order: { status: "loading", label: "Order" },
    auth: { status: "loading", label: "Auth" },
    frontend: { status: "loading", label: "Frontend" },
    rabbitmq: { status: "loading", label: "RabbitMQ" },
  });

  const { data: ordersData, isLoading: ordersLoading } = useOrders();
  const { data: unpaidData, isLoading: unpaidLoading } = useOrders({ status: "unpaid" });
  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses();
  const { data: stockData, isLoading: stockLoading } = useStock();
  const { data: revenue, isLoading: revenueLoading } = useApiGet<RevenueReport>("/revenue", () => reportApi.revenue());
  const { data: dailySalesData, isLoading: dailySalesLoading } = useApiGet<{ daily: { date: string; revenue: number }[] }>("/daily-sales", () => reportApi.dailySales());
  const { data: salesData, isLoading: salesLoading } = useApiGet<SalesReport>("/sales", () => reportApi.sales());

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

  const recentOrders = useMemo(() => ordersData?.results?.slice(0, 5) || [], [ordersData]);

  const dailyRevenue = useMemo(() => dailySalesData?.daily || [], [dailySalesData]);

  const warehouseOccupancy = useMemo(() => {
    const whs = warehousesData?.results ?? [];
    const st = stockData?.results ?? [];
    if (!whs.length || !st.length) return [];
    return whs.map((wh) => {
      const whStock = st.filter((s) => s.warehouse_name === wh.name);
      return {
        name: wh.name,
        items: whStock.length,
        quantity: whStock.reduce((s, stk) => s + stk.quantity, 0),
      };
    });
  }, [warehousesData, stockData]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersData = await authClient.admin.listUsers({ query: {} });
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const userList = (usersData.data?.users || []) as AdminUserData[];
        const recentUsers = userList.filter((u) => new Date(u.createdAt) > recentDate).length;
        setStats((prev) => ({
          ...prev,
          totalUsers: userList.length,
          activeUsers: userList.filter((u) => u.status === "active").length,
          recentUsersCount: recentUsers,
        }));
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost/api").replace(/\/api$/, "");

    const checkHealth = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`, { signal: abort.signal });
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        const svcs = data.services || {};
        setServices({
          product: { status: svcs.product?.status === "healthy" ? "healthy" : "unhealthy", label: "Product" },
          inventory: { status: svcs.inventory?.status === "healthy" ? "healthy" : "unhealthy", label: "Inventory" },
          order: { status: svcs.order?.status === "healthy" ? "healthy" : "unhealthy", label: "Order" },
          auth: { status: svcs.auth?.status === "healthy" ? "healthy" : "unhealthy", label: "Auth" },
          frontend: { status: svcs.frontend?.status === "healthy" ? "healthy" : "unhealthy", label: "Frontend" },
          rabbitmq: { status: svcs.rabbitmq?.status === "healthy" ? "healthy" : "unhealthy", label: "RabbitMQ" },
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setServices({
          product: { status: "unhealthy", label: "Product" },
          inventory: { status: "unhealthy", label: "Inventory" },
          order: { status: "unhealthy", label: "Order" },
          auth: { status: "unhealthy", label: "Auth" },
          frontend: { status: "unhealthy", label: "Frontend" },
          rabbitmq: { status: "unhealthy", label: "RabbitMQ" },
        });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => { clearInterval(interval); abort.abort(); };
  }, []);

  const isLoading = ordersLoading || unpaidLoading || warehousesLoading || stockLoading || revenueLoading || dailySalesLoading || salesLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <LayoutDashboard className="h-10 w-10 text-purple-600" />
              {tSum("title")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{tSum("subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
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
            <LayoutDashboard className="h-10 w-10 text-purple-600" />
            {tSum("title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{tSum("subtitle")}</p>
        </div>

        <ErrorAlert message={null} />

        {staleUnpaidCount > 0 && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span>{staleUnpaidCount === 1 ? tSum("staleUnpaidOne", { count: staleUnpaidCount }) : tSum("staleUnpaid", { count: staleUnpaidCount })}</span>
              <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-700 hover:bg-amber-100">
                <Link href="/admin/orders?status=unpaid">
                  {tc("view")}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("users")}</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {tSum("newThisWeek", { count: stats.recentUsersCount })}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("activeUsers")}</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.activeUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tSum("percentOfTotal", { percent: stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : "0" })}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("products")}</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tSum("stockValue", { value: stats.productsValue.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("lowStock")}</CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.lowStock}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tSum("lowStockDesc")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("revenue")}</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {revenue ? `${revenue.total_revenue.toLocaleString("uk-UA", { minimumFractionDigits: 0 })} ₴` : "—"}
              </div>
              {revenue && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tSum("marginPercent", { percent: revenue.margin_percent.toFixed(1) })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">{tSum("sections")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="dark:bg-slate-800/80 dark:border-slate-700 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{tNav(item.key)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{tNav(item.key + "Desc")}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                {tSum("recentOrders")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tSum("noOrders")}</p>
              ) : (
                <div className="space-y-2">
                      {recentOrders.map((o) => (
                        <Link key={o.id} href="/admin/orders"
                          className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100">#{o.id}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {o.customer_name || "—"} · {o.channel === "online" ? tc("online") : tc("offline")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(o.total_amount)}</span>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  {tSum("lowStock")}
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/products">{tSum("viewAll")}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {initialProducts.filter((p) => p.stock < 10).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tSum("inStock")}</p>
              ) : (
                <div className="space-y-1">
                  {initialProducts.filter((p) => p.stock < 10).slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                      </div>
                      <Badge variant="destructive" className="shrink-0">{tSum("units", { count: p.stock })}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {salesData?.by_channel && salesData.by_channel.length > 0 && (
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  {tSum("channelPie")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartPie>
                    <Pie
                      data={salesData.by_channel.map((ch) => ({
                        name: ch.channel === "online" ? tc("online") : tc("offline"),
                        value: ch.revenue,
                      }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={70} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {salesData.by_channel.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </RechartPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {warehouseOccupancy.length > 0 && (
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <Warehouse className="h-5 w-5 text-orange-600" />
                  {tSum("warehouseOccupancy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {warehouseOccupancy.map((wh) => (
                    <div key={wh.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{wh.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{tSum("units", { count: wh.quantity })}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, (wh.quantity / (Math.max(...warehouseOccupancy.map((w) => w.quantity), 1))) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                <LayoutDashboard className="h-5 w-5 text-emerald-600" />
                {tSum("quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/products"><PlusCircle className="h-4 w-4 mr-2" /> {tSum("addProduct")}</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/orders"><ShoppingCart className="h-4 w-4 mr-2" /> {tSum("viewOrders")}</Link>
              </Button>
              {(isAdmin || isWhWorker) && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/goods-receipts"><FileText className="h-4 w-4 mr-2" /> {tSum("createGrn")}</Link>
                </Button>
              )}
              {dailyRevenue.length > 0 && (
                <div className="mt-4 pt-4 border-t dark:border-slate-700">
                  <div className="text-xs text-slate-500 mb-2">{tSum("revenue30days")}</div>
                  <ResponsiveContainer width="100%" height={60}>
                    <BarChart data={dailyRevenue}>
                      <Bar dataKey="revenue" fill="#7c3aed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {recentProducts.length > 0 && (
          <Card className="dark:bg-slate-800/80 dark:border-slate-700 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                  <Clock className="h-5 w-5 text-purple-600" />
                  {tSum("recentProducts")}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={clearRecent}>
                  {tc("clear")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentProducts.map((p) => (
                  <Link key={p.id} href={`/admin/products`}
                    className="shrink-0 w-48 p-3 border rounded-lg dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatCurrency(p.price)}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID: #{p.id}</div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <BarChart3 className="h-5 w-5" />
              {tSum("systemHealth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(services).map(([key, svc]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {svc.status === "loading" ? (
                      <div className="h-5 w-5 rounded-full bg-slate-300 animate-pulse" />
                    ) : svc.status === "healthy" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{svc.label}</span>
                  </div>
                  <Badge variant={svc.status === "healthy" ? "default" : "destructive"}>
                    {svc.status === "loading" ? "..." : svc.status === "healthy" ? tSum("healthy") : tSum("unhealthy")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
