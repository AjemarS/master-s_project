"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { authClient, useCurrentUser, User } from "~/lib/auth-client";
import { UserWithRole } from "better-auth/plugins/admin";
import type { Product, RevenueReport, SalesReport } from "~/lib/types";
import { useRecentProducts } from "~/lib/hooks/use-recent-products";
import { useOrders, useWarehouses, useStock, useLowStock } from "~/lib/hooks/use-api-data";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import { ErrorAlert } from "~/ui/components/error-alert";
import { formatCurrency } from "~/lib/utils/format";
import { LastUpdated } from "../components";
import {
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Warehouse,
  CreditCard,
  Truck,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import {
  DashboardHeader,
  StaleUnpaidAlert,
  StatCard,
  NavSection,
  RecentOrdersCard,
  LowStockCard,
  ChannelPieChart,
  WarehouseOccupancyCard,
  QuickActionsCard,
  RecentProductsCard,
  SystemHealthCard,
  SupplierPerformanceCard,
  RecentDeliveriesCard,
  ActivityFeed,
  DashboardLoadingSkeleton,
} from "./dashboard";

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
  { key: "products", href: "/admin/products", icon: Package, color: "text-[var(--chart-1)]" },
  { key: "orders", href: "/admin/orders", icon: ShoppingCart, color: "text-primary" },
  { key: "pos", href: "/admin/pos", icon: CreditCard, color: "text-[var(--chart-2)]" },
  { key: "warehouses", href: "/admin/warehouses", icon: Warehouse, color: "text-[var(--chart-3)]" },
  { key: "suppliers", href: "/admin/suppliers", icon: Truck, color: "text-[var(--chart-4)]" },
  { key: "goodsReceipts", href: "/admin/goods-receipts", icon: ClipboardList, color: "text-[var(--chart-5)]" },
  { key: "reports", href: "/admin/reports", icon: BarChart3, color: "text-[var(--chart-1)]" },
  { key: "users", href: "/admin/users", icon: Users, color: "text-[var(--chart-2)]" },
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
  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

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

  const { data: lowStockData } = useLowStock(10, { refreshInterval: 15000 });
  const { data: ordersData, isLoading: ordersLoading } = useOrders(undefined, { refreshInterval: 15000 });
  const { data: unpaidData, isLoading: unpaidLoading } = useOrders({ status: "unpaid" }, { refreshInterval: 15000 });
  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses(undefined, { refreshInterval: 15000 });
  const { data: stockData, isLoading: stockLoading } = useStock(undefined, { refreshInterval: 15000 });
  const { data: revenue, isLoading: revenueLoading } = useApiGet<RevenueReport>("/revenue", () =>
    reportApi.revenue(), { refreshInterval: 15000 },
  );
  const { data: dailySalesData, isLoading: dailySalesLoading } = useApiGet<{
    daily: { date: string; revenue: number }[];
  }>("/daily-sales", () => reportApi.dailySales(), { refreshInterval: 15000 });
  const { data: salesData, isLoading: salesLoading } = useApiGet<SalesReport>("/sales", () =>
    reportApi.sales(), { refreshInterval: 15000 },
  );

  const lastUpdated = useMemo(() => new Date(), []);

  const [staleUnpaidCount, setStaleUnpaidCount] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => {
      setStaleUnpaidCount(
        unpaidData?.results
          ? unpaidData.results.filter(
              (o) => new Date(o.created_at).getTime() < Date.now() - 3600000,
            ).length
          : 0,
      );
    }, 0);
    return () => clearTimeout(id);
  }, [unpaidData]);

  const recentOrders = useMemo(() => ordersData?.results?.slice(0, 5) || [], [ordersData]);

  const dailyRevenue = useMemo(() => dailySalesData?.daily || [], [dailySalesData]);

  // Sparkline data: revenue per day as simple number array
  const revenueSparkline = useMemo(() =>
    dailyRevenue.map(d => d.revenue),
    [dailyRevenue]
  );

  const warehouseOccupancy = useMemo(() => {
    const whs = warehousesData?.results ?? [];
    const st = stockData ?? [];
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
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const usersData = await authClient.admin.listUsers({ query: {} });
        if (cancelled) return;
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const userList = (usersData.data?.users || []) as AdminUserData[];
        const recentUsers = userList.filter(
          (u) => new Date(u.createdAt) > recentDate,
        ).length;
        setStats((prev) => ({
          ...prev,
          totalUsers: userList.length,
          activeUsers: userList.filter((u) => u.status === "active").length,
          recentUsersCount: recentUsers,
        }));
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch stats:", error);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost/api"
    ).replace(/\/api$/, "");

    const checkHealth = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`, { signal: abort.signal });
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        const svcs = data.services || {};
        setServices({
          product: {
            status: svcs.product?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Product",
          },
          inventory: {
            status: svcs.inventory?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Inventory",
          },
          order: {
            status: svcs.order?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Order",
          },
          auth: {
            status: svcs.auth?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Auth",
          },
          frontend: {
            status: svcs.frontend?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Frontend",
          },
          rabbitmq: {
            status: svcs.rabbitmq?.status === "healthy" ? "healthy" : "unhealthy",
            label: "RabbitMQ",
          },
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
    return () => {
      clearInterval(interval);
      abort.abort();
    };
  }, []);

  const isLoading =
    ordersLoading ||
    unpaidLoading ||
    warehousesLoading ||
    stockLoading ||
    revenueLoading ||
    dailySalesLoading ||
    salesLoading ||
    statsLoading;

  if (isLoading) {
    return <DashboardLoadingSkeleton tSum={tSum} />;
  }

  const stockValueLabel = stats.productsValue.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader tSum={tSum} />

        <div className="mb-4">
          <LastUpdated timestamp={lastUpdated} loading={isLoading} />
        </div>

        <ErrorAlert message={null} />

        <StaleUnpaidAlert count={staleUnpaidCount} tSum={tSum} tc={tc} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title={tSum("users")}
            value={stats.totalUsers}
            icon={<Users className="h-5 w-5 text-primary" />}
            borderColor="border-t-primary"
            trend={{
              label: tSum("newThisWeek", { count: stats.recentUsersCount }),
              icon: <TrendingUp className="h-3 w-3" />,
            }}
            animationIndex={0}
          />
          <StatCard
            title={tSum("activeUsers")}
            value={stats.activeUsers}
            icon={<Users className="h-5 w-5 text-primary" />}
            borderColor="border-t-primary"
            trend={{
              label: tSum("percentOfTotal", {
                percent:
                  stats.totalUsers > 0
                    ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
                    : "0",
              }),
            }}
            animationIndex={1}
          />
          <StatCard
            title={tSum("products")}
            value={stats.totalProducts}
            icon={<Package className="h-5 w-5 text-primary" />}
            borderColor="border-t-accent-electric"
            trend={{
              label: tSum("stockValue", { value: stockValueLabel }),
            }}
            animationIndex={2}
          />
          <StatCard
            title={tSum("lowStock")}
            value={stats.lowStock}
            icon={<AlertCircle className="h-5 w-5 text-accent-electric" />}
            borderColor="border-t-destructive"
            trend={{ label: tSum("lowStockDesc") }}
            animationIndex={3}
          />
          <StatCard
            title={tSum("revenue")}
            value={
              revenue
                ? `${revenue.total_revenue.toLocaleString("uk-UA", {
                    minimumFractionDigits: 0,
                  })} ₴`
                : "—"
            }
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            borderColor="border-t-primary"
            trend={
              revenue
                ? {
                    label: tSum("marginPercent", {
                      percent: revenue.margin_percent.toFixed(1),
                    }),
                  }
                : undefined
            }
            sparklineData={revenueSparkline.length > 1 ? revenueSparkline : undefined}
            animationIndex={4}
          />
        </div>

        <NavSection items={NAV_ITEMS} tNav={tNav} tSum={tSum} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentOrdersCard
            orders={recentOrders}
            isLoading={ordersLoading}
            tSum={tSum}
            tc={tc}
            formatCurrency={formatCurrency}
          />

          <LowStockCard
            lowStockData={lowStockData}
            initialProducts={initialProducts}
            tSum={tSum}
          />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SupplierPerformanceCard tSum={tSum} />
            <RecentDeliveriesCard tSum={tSum} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ChannelPieChart
            data={salesData?.by_channel}
            colors={COLORS}
            onlineLabel={tc("online")}
            offlineLabel={tc("offline")}
            tSum={tSum}
          />

          <WarehouseOccupancyCard data={warehouseOccupancy} tSum={tSum} />

          <QuickActionsCard
            isAdmin={isAdmin}
            isWhWorker={isWhWorker}
            dailyRevenue={dailyRevenue}
            tSum={tSum}
          />
        </div>

        {/* Bottom row: Activity Feed + System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ActivityFeed tSum={tSum} tc={tc} />
          <SystemHealthCard services={services} tSum={tSum} />
        </div>

        {/* Recent Products (full width) */}
        <RecentProductsCard
          products={recentProducts}
          onClear={clearRecent}
          tSum={tSum}
          tc={tc}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
}
