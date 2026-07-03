"use client";

import { useState, useEffect, useMemo } from "react";
import { Link } from "~/i18n/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Package, ChevronDown, ChevronUp, Archive, XCircle } from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import { getAllowedTransitions } from "~/lib/utils/order-status";
import type { Order, OrderDetail } from "~/lib/types";
import { TableSkeleton } from "../../admin/components";

const ACTIVE_STATUSES = ["unpaid", "paid", "delivering", "delivered"];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Не сплачено", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30" },
  paid: { label: "Сплачено", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30" },
  delivering: { label: "В дорозі", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30" },
  delivered: { label: "Доставлено", color: "bg-green-100 text-green-800 dark:bg-green-900/30" },
  completed: { label: "Виконано", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30" },
  cancelled: { label: "Скасовано", color: "bg-red-100 text-red-800 dark:bg-red-900/30" },
};

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export function MyOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await orderApi.getMy();
        if (res.error) throw new Error(res.error.message);
        setOrders(res.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const toggleExpand = async (orderId: number) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    if (!orderDetails[orderId]) {
      try {
        const res = await orderApi.getById(orderId);
        if (res.data) setOrderDetails((prev) => ({ ...prev, [orderId]: res.data! }));
      } catch { /* silent */ }
    }
    setExpandedId(orderId);
  };

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), 60000);
    return () => clearTimeout(id);
  }, [now]);

  const handleCancel = async (orderId: number) => {
    try {
      const res = await orderApi.cancel(orderId);
      if (res.error) throw new Error(res.error.message);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o))
      );
    } catch (err) {
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
            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">№</th>
            {showStatus && <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Статус</th>}
            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Канал</th>
            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Сума</th>
            <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дата</th>
            <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((order) => {
            const cfg = STATUS_CFG[order.status] || { label: order.status, color: "" };
            return (
              <tr key={order.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                  <Link href={`/order/${order.id}`} className="hover:text-purple-600">{order.order_number}</Link>
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
                <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.total_amount)}</td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{new Date(order.created_at).toLocaleDateString("uk-UA")}</td>
                <td className="p-4 text-right flex items-center justify-end gap-1">
                  {getAllowedTransitions(order.status).includes("cancelled") && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleCancel(order.id)}>
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
              <td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                Немає замовлень
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="dark:bg-slate-800/80 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-slate-100">
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
