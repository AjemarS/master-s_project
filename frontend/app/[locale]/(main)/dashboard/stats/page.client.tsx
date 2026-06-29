"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

import type { User } from "~/lib/auth-client";

import { signOut, useCurrentUser } from "~/lib/auth-client";
import { orderApi } from "~/lib/api/admin-api";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Skeleton } from "~/ui/primitives/skeleton";
import { ShoppingBag, Package, ArrowRight, Loader2 } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import type { Order } from "~/lib/types";

interface DashboardPageClientProps {
  user?: null | User;
}

export function DashboardPageClient({ user }: DashboardPageClientProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { isPending } = useCurrentUser();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (user) {
      orderApi.getMy().then((res) => {
        if (res.data) {
          setOrders((res.data.results || []).slice(0, 5));
          setOrderCount(res.data.count || 0);
        }
        setLoadingOrders(false);
      }).catch(() => {
        setLoadingOrders(false);
      });
    }
  }, [user]);

  const handleSignOut = () => {
    void signOut();
  };

  if (isPending) {
    return (
      <div className="container grid flex-1 items-start gap-4 p-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <div className="grid gap-4 md:col-span-2 lg:col-span-1">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-28" />
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const ORDER_STATUS_COLORS: Record<string, string> = {
    unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    delivering: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="container grid flex-1 items-start gap-4 p-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
      <div className="grid gap-4 md:col-span-2 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{t("welcomeTitle")}</CardTitle>
            <CardDescription>{t("welcomeDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {user && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{t("yourInfo")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{t("name")}</p>
                  <p className="text-sm text-muted-foreground">{user.name ?? t("notSet")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{t("email")}</p>
                  <p className="text-sm text-muted-foreground">{user.email ?? t("notSet")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{t("twoFactorAuth")}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.twoFactorEnabled ? t("enabled") : t("disabled")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              href="/dashboard/profile"
            >
              {t("editProfile")}
            </Link>
            <Button onClick={handleSignOut} variant="destructive">
              {t("signOut")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("orderStats")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("totalOrders")}</span>
                  <span className="text-2xl font-bold">{orderCount}</span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/orders">
                {t("viewOrders")} <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 md:col-span-2 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/order/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {t("recentOrders")} #{order.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(order.total_amount)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status] || ""}`}>
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                href="/orders"
              >
                {t("viewOrders")}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                href="/products"
              >
                {t("browseProducts")}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
