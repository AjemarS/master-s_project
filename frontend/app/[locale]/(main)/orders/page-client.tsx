"use client";

import { useState, useEffect, useMemo } from "react";
import { useSWRConfig } from "swr";
import { Link } from "~/i18n/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Package, ChevronDown, ChevronUp, Archive, XCircle } from "lucide-react";
import { useCancelOrder, useMyOrders } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";
import { getAllowedTransitions } from "~/lib/utils/order-status";
import type { Order } from "~/lib/types";
import { TableSkeleton } from "../../admin/components";

const ACTIVE_STATUSES = ["unpaid", "paid", "delivering", "delivered"];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Не сплачено", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30" },
  paid: { label: "Сплачено", color: "bg-green-50 text-green-700 dark:bg-green-950/30" },
  delivering: { label: "В дорозі", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30" },
  delivered: { label: "Доставлено", color: "bg-green-100 text-green-800 dark:bg-green-900/30" },
  completed: { label: "Виконано", color: "bg-chart-1/10 text-chart-1 dark:bg-chart-1/20" },
  cancelled: { label: "Скасовано", color: "bg-red-100 text-red-800 dark:bg-red-900/30" },
};

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export function MyOrdersClient() {
  const { data: myOrdersData, isLoading, error } = useMyOrders();
  const { trigger: cancelOrder } = useCancelOrder();
  const { mutate: globalMutate } = useSWRConfig();
  const orders = useMemo(() => myOrdersData?.results ?? [], [myOrdersData]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const toggleExpand = (orderId: number) => {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  };

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), 60000);
    return () => clearTimeout(id);
  }, [now]);

  const handleCancel = async (orderId: number) => {
    const prevStatus = orders.find((o) => o.id === orderId)?.status;
    try {
      globalMutate(
        (k: string) => typeof k === "string" && k.startsWith("/orders/my"),
        (prev?: { results: Order[]; count: number }) =>
          prev
            ? { ...prev, results: prev.results.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o)) }
            : prev,
        { revalidate: false },
      );
      await cancelOrder(orderId);
    } catch (err) {
      globalMutate(
        (k: string) => typeof k === "string" && k.startsWith("/orders/my"),
        (prev?: { results: Order[]; count: number }) =>
          prev && prevStatus
            ? { ...prev, results: prev.results.map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o)) }
            : prev,
        { revalidate: false },
      );
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    }
  };

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders]
  );

  const active = useMemo(
    () => sorted.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    [sorted]
  );

  const archived = useMemo(
    () => sorted.filter((o) => {
      if (!ACTIVE_STATUSES.includes(o.status)) return true;
      return now - new Date(o.created_at).getTime() > SIX_MONTHS_MS;
    }),
    [sorted, now]
  );

  const renderTable = (items: Order[], showStatus: boolean) => (
    <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
          <tr>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">№</th>
            {showStatus && <th className="text-left p-4 text-sm font-medium text-muted-foreground">Статус</th>}
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Канал</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Сума</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Дата</th>
            <th className="text-right p-4 text-sm font-medium text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((order) => {
            const cfg = STATUS_CFG[order.status] || { label: order.status, color: "" };
            return (
              <tr key={order.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-medium text-foreground">
                  <Link href={`/order/${order.id}`} className="hover:text-primary">{order.order_number}</Link>
                </td>
                {showStatus && (
                  <td className="p-4">
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                  </td>
                )}
                <td className="p-4">
                  <Badge variant={order.channel === "online" ? "default" : "secondary"}>
                    {order.channel === "online" ? "Онлайн" : "POS"}
                  </Badge>
                </td>
                <td className="p-4 font-semibold text-foreground">{formatCurrency(order.total_amount)}</td>
                <td className="p-4 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("uk-UA")}</td>
                <td className="p-4 text-right flex items-center justify-end gap-1">
                  {getAllowedTransitions(order.status).includes("cancelled") && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80" onClick={() => handleCancel(order.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(order.id)}>
                    {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                Немає замовлень
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) return <TableSkeleton rows={4} cols={5} />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error?.message ?? "Failed to load orders"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="dark:bg-slate-800/80 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Package className="h-5 w-5" />
          Мої замовлення
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active orders */}
        {renderTable(active, true)}

        {/* Archived orders */}
        {archived.length > 0 && (
          <div>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowArchive(!showArchive)}
            >
              <Archive className="h-4 w-4" />
              {showArchive ? "Сховати архів" : `Архів (${archived.length})`}
              {showArchive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showArchive && (
              <div className="mt-4 opacity-70">
                {renderTable(archived, true)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
