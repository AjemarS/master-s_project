"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { authClient, useCurrentUser } from "~/lib/auth-client";
import { UserWithRole } from "better-auth/plugins/admin";
import type { User } from "~/lib/auth-client";
import type { Product, RevenueReport } from "~/lib/types";
import { useLowStock, useOrders } from "~/lib/hooks/use-api-data";
import { useApiGet } from "~/lib/hooks/use-api";
import { useStaleUnpaidCount } from "~/lib/hooks/use-stale-unpaid";
import { reportApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { ErrorAlert } from "~/ui/components/error-alert";
import {
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import {
  StaleUnpaidAlert,
  StatCard,
} from "../dashboard";

type AdminUserData = UserWithRole & Pick<User, "status">;

interface DashboardStatsProps {
  initialProducts: Product[];
}

const lowStockThreshold = 10;

export function DashboardStats({ initialProducts }: DashboardStatsProps) {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: initialProducts.length,
    lowStock: initialProducts.filter((p) => p.stock < lowStockThreshold).length,
    recentUsersCount: 0,
    productsValue: initialProducts.reduce(
      (sum, p) => sum + p.price * p.stock, 0,
    ),
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const { data: dailySalesData, isLoading: dailySalesLoading } = useApiGet<{
    daily: { date: string; revenue: number }[];
  }>("/daily-sales", () => reportApi.dailySales(), { refreshInterval: 15000 });
  const { data: revenue, isLoading: revenueLoading } = useApiGet<RevenueReport>(
    "/revenue",
    () => reportApi.revenue(),
    { refreshInterval: 15000 },
  );
  const { staleUnpaidCount } = useStaleUnpaidCount();

  const dailyRevenue = useMemo(() => dailySalesData?.daily || [], [dailySalesData]);
  const revenueSparkline = useMemo(
    () => dailyRevenue.map((d) => d.revenue),
    [dailyRevenue],
  );

  // Fetch user stats from auth
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
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = statsLoading || dailySalesLoading || revenueLoading;

  if (isLoading) {
    // Show individual stat card skeletons instead of blocking everything
    return (
      <>
        <StaleUnpaidAlert count={0} tSum={tSum} tc={tc} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 space-y-3"
            >
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const stockValueLabel = stats.productsValue.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <StaleUnpaidAlert count={staleUnpaidCount} tSum={tSum} tc={tc} />

      <ErrorAlert message={null} />

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
          sparklineData={
            revenueSparkline.length > 1 ? revenueSparkline : undefined
          }
          animationIndex={4}
        />
      </div>
    </>
  );
}
