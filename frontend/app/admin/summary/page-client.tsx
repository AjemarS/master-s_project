"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Badge } from "~/ui/primitives/badge";
import {
  Users, Package, TrendingUp, AlertCircle,
  CheckCircle, XCircle, LayoutDashboard, BarChart3,
  ShoppingCart, Warehouse, CreditCard, Truck, ClipboardList,
} from "lucide-react";
import { authClient, User } from "~/lib/auth-client";
import { UserWithRole } from "better-auth/plugins/admin";
import type { Product } from "~/lib/types";
import { StatsCardSkeleton } from "../components";

interface UserData extends UserWithRole {
  status?: User["status"];
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  lowStock: number;
  recentUsersCount: number;
  productsValue: number;
}

interface SummaryPageClientProps {
  initialProducts: Product[];
}

const NAV_ITEMS = [
  { href: "/admin/products", icon: Package, name: "Товари", desc: "Каталог, ціни, залишки", color: "text-purple-600" },
  { href: "/admin/orders", icon: ShoppingCart, name: "Замовлення", desc: "Статуси, фільтри, керування", color: "text-blue-600" },
  { href: "/admin/pos", icon: CreditCard, name: "POS-термінал", desc: "Офлайн продаж у шоурумі", color: "text-emerald-600" },
  { href: "/admin/warehouses", icon: Warehouse, name: "Склади", desc: "Залишки та запаси", color: "text-orange-600" },
  { href: "/admin/suppliers", icon: Truck, name: "Постачальники", desc: "Керування постачанням", color: "text-sky-600" },
  { href: "/admin/goods-receipts", icon: ClipboardList, name: "Накладні", desc: "Оприбуткування товару", color: "text-rose-600" },
  { href: "/admin/reports", icon: BarChart3, name: "Звіти", desc: "Продажі, виручка, маржа", color: "text-violet-600" },
  { href: "/admin/users", icon: Users, name: "Користувачі", desc: "Облікові записи та ролі", color: "text-cyan-600" },
];

export default function SummaryPageClient({ initialProducts }: SummaryPageClientProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: initialProducts.length,
    lowStock: initialProducts.filter((p) => p.stock < 10).length,
    recentUsersCount: 0,
    productsValue: initialProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setFetchError(null);
        const usersData = await authClient.admin.listUsers({ query: {} });

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const userList = usersData.data?.users || [];
        const recentUsers =
          userList.filter((u: UserData) => new Date(u.createdAt) > recentDate).length;

        setStats((prev) => ({
          ...prev,
          totalUsers: userList.length,
          activeUsers: userList.filter((u: UserData) => u.status === "active").length,
          recentUsersCount: recentUsers,
        }));
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setFetchError(
          error instanceof Error ? error.message : "Не вдалося завантажити статистику."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost/api").replace(/\/api$/, "");
      try {
        const res = await fetch(`${baseUrl}/health`);
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
      } catch {
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
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <LayoutDashboard className="h-10 w-10 text-purple-600" />
              Огляд системи
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Загальна статистика системи</p>
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
            Огляд системи
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Загальна статистика та навігація</p>
        </div>

        {fetchError && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              {fetchError}
            </AlertDescription>
          </Alert>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Користувачів</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stats.recentUsersCount} нових за тиждень
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Активні</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.activeUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : "0"}% від загалу
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Товарів</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stats.productsValue.toFixed(2)} ₴ вартість запасів
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Малий залишок</CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.lowStock}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Товарів менше 10 од.</p>
            </CardContent>
          </Card>
        </div>

        {/* Навігація розділами */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Розділи адмін-панелі</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="dark:bg-slate-800/80 dark:border-slate-700 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Стан системи */}
        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <BarChart3 className="h-5 w-5" />
              Стан системи
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
                    {svc.status === "loading" ? "..." : svc.status === "healthy" ? "Працює" : "Помилка"}
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
