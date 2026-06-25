"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Link } from "~/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { ArrowLeft, Package, ShoppingBag, Loader2 } from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import type { OrderDetail } from "~/lib/types";

const STATUS_LABELS: Record<string, string> = {
  unpaid: "Не сплачено",
  paid: "Сплачено",
  delivering: "В дорозі",
  delivered: "Доставлено",
  completed: "Виконано",
  cancelled: "Скасовано",
};

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30",
  delivering: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    orderApi.getById(Number(id)).then((res) => {
      if (res.data) {
        setOrder(res.data);
      } else {
        setError(res.error?.message || "Order not found");
      }
      setLoading(false);
    }).catch(() => {
      setError("Failed to load order");
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Package className="h-16 w-16 mx-auto mb-2 text-slate-300" />
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>{error || "Could not find this order."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Back to Store</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order #{order.id}</CardTitle>
                <CardDescription>{order.order_number}</CardDescription>
              </div>
              <Badge className={STATUS_COLORS[order.status] || ""}>
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-medium">{order.customer_name || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <p className="font-medium">{order.customer_email || "—"}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-slate-600 mb-2">Items</h3>
              <div className="border rounded-lg overflow-hidden dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Product</th>
                      <th className="text-right p-3 font-medium text-slate-600 dark:text-slate-400">Qty</th>
                      <th className="text-right p-3 font-medium text-slate-600 dark:text-slate-400">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-t dark:border-slate-700">
                        <td className="p-3 text-slate-900 dark:text-slate-200">{item.product_name || `#${item.product_id}`}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                        <td className="p-3 text-right font-medium">₴{Number(item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-4">
              <span>Total</span>
              <span>₴{Number(order.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">
                  <ShoppingBag className="h-4 w-4 mr-2" /> Continue Shopping
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
