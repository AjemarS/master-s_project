"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "~/i18n/navigation";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  MapPin,
  HeadphonesIcon,
  ArrowRight,
  Loader2,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Skeleton } from "~/ui/primitives/skeleton";
import { useCurrentUserOrRedirect } from "~/lib/auth-client";
import { orderApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import type { Order } from "~/lib/types";
import { toast } from "sonner";

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMemberDate(date: string | Date | null | undefined, locale: string): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function isActiveStatus(status: string): boolean {
  return ["unpaid", "paid", "delivering"].includes(status);
}

function isCompletedStatus(status: string): boolean {
  return ["delivered", "completed"].includes(status);
}

export function OverviewClient() {
  const t = useTranslations("overview");
  const locale = useLocale();
  const { user, isPending: authPending } = useCurrentUserOrRedirect("/sign-in");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authPending) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await orderApi.getMy();
        if (res.error) throw new Error(res.error.message);
        setOrders(res.data?.results || []);
      } catch {
        // silent — empty state handles it
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [authPending]);

  if (authPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => isActiveStatus(o.status)).length;
  const completedOrders = orders.filter((o) => isCompletedStatus(o.status)).length;

  const handleContactSupport = () => {
    toast.info(t("contactSupport"), {
      description: "support@techhub.com",
    });
  };

  const handleFindStore = () => {
    window.open(
      "https://www.google.com/maps/search/tech+store+near+me",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="relative overflow-hidden border-0 bg-linear-to-br from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                {t("welcomeBack", { name: user?.name || user?.email || t("loading") })}
              </h3>
              <p className="mt-1 text-sm text-white/80">
                {t("memberSince", { date: formatMemberDate(user?.createdAt, locale) })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/my/settings">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border-0 shadow-none"
                >
                  {t("editProfile")}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
              <p className="text-2xl font-bold tracking-tight">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : totalOrders}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("activeOrders")}</p>
              <p className="text-2xl font-bold tracking-tight">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : activeOrders}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("completedOrders")}</p>
              <p className="text-2xl font-bold tracking-tight">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : completedOrders}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="min-h-96 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders — 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-4 h-full">
          <h3 className="text-lg font-semibold tracking-tight">{t("recentOrders")}</h3>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : recentOrders.length === 0 ? (
            <Card className="h-full">
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground mb-4">{t("noRecentOrders")}</p>
                <Link href="/products">
                  <Button variant="outline">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t("browseProducts")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link key={order.id} href={`/my/orders/${order.id}`} className="block">
                  <Card className="transition-colors hover:bg-accent/50 dark:hover:bg-accent/10 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              #{order.order_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.created_at, locale)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-sm">
                            {formatCurrency(order.total_amount)}
                          </span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <div className="pt-1">
                <Link href="/my/orders">
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                    {t("viewAllOrders")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions — 1/3 width on desktop */}
        <div className="space-y-4 h-full">
          <h3 className="text-lg font-semibold tracking-tight">{t("quickActions")}</h3>
          <Card className="h-full">
            <CardContent className="p-4 grid grid-cols-1 gap-2">
              <Link href="/products">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4">
                  <ShoppingBag className="h-5 w-5 text-purple-500 shrink-0" />
                  <span>{t("browseProducts")}</span>
                </Button>
              </Link>

              <Link href="/my/orders">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4">
                  <Package className="h-5 w-5 text-primary shrink-0" />
                  <span>{t("viewAllOrders")}</span>
                </Button>
              </Link>

              <Link href="/my/settings">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 px-4">
                  <ShoppingBag className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>{t("editProfile")}</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                onClick={handleFindStore}
              >
                <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>{t("findStore")}</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                onClick={handleContactSupport}
              >
                <HeadphonesIcon className="h-5 w-5 text-rose-500 shrink-0" />
                <span>{t("contactSupport")}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
