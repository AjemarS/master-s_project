"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "~/i18n/navigation";
import { useMemo, useState } from "react";
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
import { useMyOrders } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { toast } from "sonner";

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "—";
  const localeForIntl = locale === "ua" ? "uk" : locale;
  try {
    return new Date(dateStr).toLocaleDateString(localeForIntl, {
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
  const localeForIntl = locale === "ua" ? "uk" : locale;
  try {
    return new Date(date).toLocaleDateString(localeForIntl, {
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
  const tCommon = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);
  const { user, isPending: authPending } = useCurrentUserOrRedirect("/sign-in");

  const { data: myOrdersData, isLoading } = useMyOrders();
  const orders = useMemo(() => myOrdersData?.results ?? [], [myOrdersData]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [orders],
  );

  const { totalOrders, activeOrders, completedOrders } = useMemo(
    () => ({
      totalOrders: orders.length,
      activeOrders: orders.filter((o) => isActiveStatus(o.status)).length,
      completedOrders: orders.filter((o) => isCompletedStatus(o.status)).length,
    }),
    [orders],
  );

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

  // Profile completion nudges
  const isFirstNameMissing = !user?.first_name;
  const isLastNameMissing = !user?.last_name;
  const isPhoneMissing = !user?.phone;
  const isEmailVerified = !!user?.emailVerified;

  const missingCount = [isFirstNameMissing, isLastNameMissing, isPhoneMissing, !isEmailVerified].filter(Boolean).length;
  const filledCount = 4 - missingCount;
  const percent = Math.round((filledCount / 4) * 100);

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

      {/* Profile completion nudge */}
      {!dismissed && percent < 100 && (
        <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {t("profileCompletion")}
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("completionPercent", { percent: String(percent) })}
                </p>
              </div>
              <div className="w-24 h-2 rounded-full bg-amber-200 dark:bg-amber-700">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {isFirstNameMissing && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{t("addFirstName")}</span>
                  </div>
                  <Link href="/my/settings?tab=profile">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-800">
                      {tCommon("edit")}
                    </Button>
                  </Link>
                </div>
              )}
              {isLastNameMissing && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{t("addLastName")}</span>
                  </div>
                  <Link href="/my/settings?tab=profile">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-800">
                      {tCommon("edit")}
                    </Button>
                  </Link>
                </div>
              )}
              {isPhoneMissing && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{t("addPhone")}</span>
                  </div>
                  <Link href="/my/settings?tab=profile">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-800">
                      {tCommon("edit")}
                    </Button>
                  </Link>
                </div>
              )}
              {!isEmailVerified && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{t("verifyEmail")}</span>
                  </div>
                  <Link href="/my/settings?tab=profile">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-800">
                      {tCommon("edit")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs text-amber-500 hover:text-amber-700"
              onClick={() => setDismissed(true)}
            >
              {t("remindLater")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
              <p className="text-2xl font-bold tracking-tight">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : totalOrders}
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
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : activeOrders}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("completedOrders")}</p>
              <p className="text-2xl font-bold tracking-tight">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : completedOrders}
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

          {isLoading ? (
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
                  <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
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
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>{t("findStore")}</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                onClick={handleContactSupport}
              >
                <HeadphonesIcon className="h-5 w-5 text-accent-electric shrink-0" />
                <span>{t("contactSupport")}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
