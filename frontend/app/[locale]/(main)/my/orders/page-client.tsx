"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "~/i18n/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/ui/primitives/tabs";
import { Input } from "~/ui/primitives/input";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Skeleton } from "~/ui/primitives/skeleton";
import { AlertCircle, Search, Package, XCircle, Archive, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { getAllowedTransitions } from "~/lib/utils/order-status";
import type { Order, OrderDetail } from "~/lib/types";

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function isActiveStatus(status: string): boolean {
  return ["unpaid", "paid", "delivering", "delivered"].includes(status);
}

function isArchivedOrder(order: Order, now: number): boolean {
  return !isActiveStatus(order.status) || now - new Date(order.created_at).getTime() > SIX_MONTHS_MS;
}

export function MyOrdersClient() {
  const t = useTranslations("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});
  const [now, setNow] = useState(Date.now);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await orderApi.getMy();
        if (res.error) throw new Error(res.error.message);
        setOrders(res.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [t]);

  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), 60000);
    return () => clearTimeout(id);
  }, [now]);

  const toggleExpand = async (orderId: number) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    if (!orderDetails[orderId]) {
      try {
        const res = await orderApi.getById(orderId);
        if (res.data) setOrderDetails((prev) => ({ ...prev, [orderId]: res.data! }));
      } catch {
        /* silent */
      }
    }
    setExpandedId(orderId);
  };

  const handleCancel = async (orderId: number) => {
    if (!window.confirm(t("cancelConfirm"))) return;
    setCancellingId(orderId);
    try {
      const res = await orderApi.cancel(orderId);
      if (res.error) throw new Error(res.error.message);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o))
      );
      toast.success(t("cancelledSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  };

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  const filtered = useMemo(() => {
    let result = sorted;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((o) => o.order_number.toLowerCase().includes(q));
    }
    if (tab === "active") {
      result = result.filter((o) => isActiveStatus(o.status));
    } else if (tab === "completed") {
      result = result.filter((o) => o.status === "completed");
    } else if (tab === "cancelled") {
      result = result.filter((o) => o.status === "cancelled");
    }
    return result;
  }, [sorted, search, tab]);

  const displayOrders = useMemo(() => {
    if (tab === "all") {
      if (showArchive) return filtered;
      return filtered.filter((o) => !isArchivedOrder(o, now));
    }
    return filtered;
  }, [filtered, tab, showArchive, now]);

  const activeCount = sorted.filter((o) => isActiveStatus(o.status)).length;
  const completedCount = sorted.filter((o) => o.status === "completed").length;
  const cancelledCount = sorted.filter((o) => o.status === "cancelled").length;
  const archivedCount = sorted.filter((o) => !isActiveStatus(o.status)).length;

  const tabLabels: Record<string, string> = {
    all: t("all"),
    active: `${t("active")} (${activeCount})`,
    completed: `${t("completed")} (${completedCount})`,
    cancelled: `${t("cancelled")} (${cancelledCount})`,
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          {t("error")}
        </Button>
      </Alert>
    );
  }

  const renderOrderCard = (order: Order) => {
    const detail = orderDetails[expandedId === order.id ? order.id : -1];
    const isExpanded = expandedId === order.id;

    return (
      <Card key={order.id} className="dark:bg-card dark:border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Link
                  href={`/my/orders/${order.id}`}
                  className="font-semibold text-base hover:text-primary dark:text-foreground dark:hover:text-primary transition-colors"
                >
                  {t("orderNumber", { id: order.order_number })}
                </Link>
                <OrderStatusBadge status={order.status} t={t} />
                <Badge variant={order.channel === "online" ? "default" : "secondary"}>
                  {order.channel === "online" ? t("online") : t("offline")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{t("total")}: <strong className="text-foreground">{formatCurrency(order.total_amount)}</strong></span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {getAllowedTransitions(order.status).includes("cancelled") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  disabled={cancellingId === order.id}
                  onClick={(e) => { e.preventDefault(); handleCancel(order.id); }}
                >
                  {cancellingId === order.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => toggleExpand(order.id)}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {isExpanded && detail && (
            <div className="mt-4 pt-4 border-t dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b dark:border-slate-700">
                    <th className="text-left py-2 font-medium">{t("product")}</th>
                    <th className="text-right py-2 font-medium">{t("qty")}</th>
                    <th className="text-right py-2 font-medium">{t("price")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id} className="border-b dark:border-slate-700/50">
                      <td className="py-2 text-foreground">{item.product_name}</td>
                      <td className="py-2 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="py-2 text-right text-foreground">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between mt-3 pt-2 border-t dark:border-slate-700 font-semibold">
                <span>{t("total")}</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mt-6 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">{tabLabels.all}</TabsTrigger>
          <TabsTrigger value="active">{tabLabels.active}</TabsTrigger>
          <TabsTrigger value="completed">{tabLabels.completed}</TabsTrigger>
          <TabsTrigger value="cancelled">{tabLabels.cancelled}</TabsTrigger>
        </TabsList>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {["all", "active", "completed", "cancelled"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-4 space-y-3">
            {displayOrders.length === 0 ? (
              <Card className="dark:bg-slate-800/60 dark:border-slate-700">
                <CardContent className="py-12 text-center">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {tabValue === "all" ? t("noOrders") : t("noOrders")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t("noOrdersDesc")}
                  </p>
                  <Link href="/products">
                    <Button>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      {t("browseProducts")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              displayOrders.map(renderOrderCard)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {tab === "all" && archivedCount > 0 && (
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowArchive(!showArchive)}
        >
          <Archive className="h-4 w-4" />
          {showArchive ? t("hideArchive") : `${t("archive")} (${archivedCount})`}
          {showArchive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
