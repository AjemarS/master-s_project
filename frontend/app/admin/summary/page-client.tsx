"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Users, Package, ArrowRight, TrendingUp, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setFetchError(null);
        // Fetch users stats from better-auth (browser-only)
        const usersData = await authClient.admin.listUsers({ query: {} });

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentUsers =
          usersData.data!.users.filter((u: UserData) => new Date(u.createdAt) > recentDate)
            .length || 0;

        setStats((prev) => ({
          ...prev,
          totalUsers: usersData.data!.users?.length || 0,
          activeUsers:
            usersData.data!.users?.filter((u: UserData) => u.status === "active").length || 0,
          recentUsersCount: recentUsers,
        }));
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setFetchError(
          error instanceof Error ? error.message : "Failed to load admin statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Dashboard Summary</h1>
            <p className="text-slate-600 dark:text-slate-400">Overview of your system statistics</p>
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
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Dashboard Summary</h1>
          <p className="text-slate-600 dark:text-slate-400">Overview of your system statistics</p>
        </div>

        {fetchError && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              {fetchError}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stats.recentUsersCount} new this week
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Active Users</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.activeUsers}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : "0"}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Products</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ${stats.productsValue.toFixed(2)} inventory value
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Low Stock Alert</CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.lowStock}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Products below 10 units</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                <Users className="h-5 w-5" />
                Users Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage user accounts and roles using Better-Auth admin functionality.
              </p>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Active Users</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.activeUsers}</div>
                </div>
                <Badge variant="default" className="text-sm">
                  {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(0) : "0"}%
                </Badge>
              </div>
              <Link href="/admin/users">
                <Button className="w-full flex items-center justify-center gap-2">
                  Manage Users
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                <Package className="h-5 w-5" />
                Products Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage your product catalog, inventory, and pricing via Django REST API.
              </p>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Low Stock Items</div>
                  <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
                </div>
                <Badge variant="destructive" className="text-sm">
                  Needs attention
                </Badge>
              </div>
              <Link href="/admin/products">
                <Button className="w-full flex items-center justify-center gap-2">
                  Manage Products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="mt-6 dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">Auth Service</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth"}</div>
                  </div>
                </div>
                <Badge variant="default">Online</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">Product Service</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{process.env.NEXT_PUBLIC_API_URL || "http://localhost/api"}</div>
                  </div>
                </div>
                <Badge variant="default">Online</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
