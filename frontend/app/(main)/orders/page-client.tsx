"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Package, ChevronDown, ChevronUp } from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import type { Order, OrderDetail } from "~/lib/types";
import { TableSkeleton } from "~/admin/components";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Очікує", variant: "outline" },
  shipped: { label: "Відправлено", variant: "default" },
  delivered: { label: "Доставлено", variant: "default" },
  cancelled: { label: "Скасовано", variant: "destructive" },
};

export function MyOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});

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
      } catch {
        // silently fail
      }
    }
    setExpandedId(orderId);
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Мої замовлення
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Номер замовлення</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Статус</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Канал</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Сума</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Дата</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    У вас ще немає замовлень
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusCfg = statusLabels[order.status] || { label: order.status, variant: "outline" as const };
                  return (
                    <tr key={order.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{order.order_number}</td>
                      <td className="p-4">
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={order.channel === "online" ? "default" : "secondary"}>
                          {order.channel === "online" ? "Онлайн" : "Офлайн"}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold">{Number(order.total_amount).toFixed(2)} ₴</td>
                      <td className="p-4 text-slate-600">{new Date(order.created_at).toLocaleDateString("uk-UA")}</td>
                      <td className="p-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggleExpand(order.id)}>
                          {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {expandedId && orderDetails[expandedId] && (
          <div className="mt-4 p-4 border rounded-lg bg-slate-50">
            <h4 className="font-semibold mb-2">Товари в замовленні</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Товар</th>
                  <th className="text-left p-2">Кількість</th>
                  <th className="text-left p-2">Ціна</th>
                  <th className="text-left p-2">Сума</th>
                </tr>
              </thead>
              <tbody>
                {orderDetails[expandedId].items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.product_name}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">{Number(item.price).toFixed(2)} ₴</td>
                    <td className="p-2 font-medium">{(item.quantity * Number(item.price)).toFixed(2)} ₴</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
