"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Package,
} from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import type { Order, OrderDetail } from "~/lib/types";
import { TableSkeleton } from "../components/loading-skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/ui/primitives/dropdown-menu";

const PAGE_SIZE = 20;

const CHANNEL_TABS = [
  { value: "", label: "Всі канали" },
  { value: "online", label: "Онлайн" },
  { value: "offline", label: "Офлайн (POS)" },
] as const;

const STATUS_TABS = [
  { value: "", label: "Всі" },
  { value: "unpaid", label: "Не сплачено" },
  { value: "paid", label: "Сплачено" },
  { value: "delivering", label: "В дорозі" },
  { value: "delivered", label: "Доставлено" },
  { value: "completed", label: "Виконано" },
  { value: "cancelled", label: "Скасовано" },
] as const;

const STATUS_UPDATE_OPTIONS = [
  { value: "unpaid", label: "Не сплачено" },
  { value: "paid", label: "Сплачено" },
  { value: "delivering", label: "В дорозі" },
  { value: "delivered", label: "Доставлено" },
  { value: "completed", label: "Виконано" },
  { value: "cancelled", label: "Скасовано" },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "unpaid":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "paid":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "delivering":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "";
  }
}

function channelLabel(channel: string): string {
  return channel === "online" ? "Онлайн" : "Офлайн";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: "Не сплачено",
    paid: "Сплачено",
    delivering: "В дорозі",
    delivered: "Доставлено",
    completed: "Виконано",
    cancelled: "Скасовано",
  };
  return map[status] || status;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `${Number(amount).toFixed(2)} ₴`;
}

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderApi.getAll({
        page,
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
      });
      if (response.error) {
        setError(response.error.message);
        toast.error("Помилка завантаження", {
          description: response.error.message,
        });
      } else if (response.data) {
        setOrders(response.data.results);
        setTotalCount(response.data.count);
        setCurrentPage(page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка завантаження замовлень";
      setError(message);
      toast.error("Помилка", { description: message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    queueMicrotask(() => fetchOrders(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, channelFilter]);

  const handleExpandOrder = async (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderDetails[orderId]) {
      try {
        const response = await orderApi.getById(orderId);
        if (response.data) {
          setOrderDetails((prev) => ({ ...prev, [orderId]: response.data! }));
        }
      } catch {
        toast.error("Помилка", { description: "Не вдалося завантажити деталі замовлення" });
      }
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await orderApi.updateStatus(orderId, newStatus);
      if (response.error) {
        toast.error("Помилка оновлення статусу", {
          description: response.error.message,
        });
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
        );
        if (orderDetails[orderId]) {
          setOrderDetails((prev) => ({
            ...prev,
            [orderId]: { ...prev[orderId], status: newStatus as Order["status"] },
          }));
        }
        toast.success("Статус оновлено", {
          description: `Статус замовлення #${orderId} змінено на "${statusLabel(newStatus)}"`,
        });
      }
    } catch (err) {
      toast.error("Помилка", {
        description: err instanceof Error ? err.message : "Не вдалося оновити статус",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <ShoppingCart className="h-10 w-10 text-purple-600" />
                Керування замовленнями
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Перегляд та керування замовленнями
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-2 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Channel Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CHANNEL_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={channelFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setChannelFilter(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">Список замовлень</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Всього {totalCount} замовлень
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Замовлення</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Канал</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Статус</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Клієнт</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Сума</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дата</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Немає замовлень
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <Fragment key={order.id}>
                          <tr
                            className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => handleExpandOrder(order.id)}
                          >
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                {expandedOrderId === order.id ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                                {order.order_number}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {channelLabel(order.channel)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={order.status === "cancelled" ? "destructive" : "outline"}
                                className={statusBadgeClass(order.status)}
                              >
                                {statusLabel(order.status)}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">
                              {order.customer_name || "—"}
                            </td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(order.total_amount)}
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={updatingOrderId === order.id}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {updatingOrderId === order.id ? "..." : statusLabel(order.status)}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {STATUS_UPDATE_OPTIONS.filter(
                                      (opt) => opt.value !== order.status
                                    ).map((opt) => (
                                      <DropdownMenuItem
                                        key={opt.value}
                                        onClick={() => handleStatusUpdate(order.id, opt.value)}
                                      >
                                        {opt.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                          {expandedOrderId === order.id && (
                            <tr className="bg-slate-50 dark:bg-slate-800/30">
                              <td colSpan={7} className="p-4">
                                <div className="pl-8">
                                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Товари в замовленні:
                                  </h4>
                                  {orderDetails[order.id] ? (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b dark:border-slate-700">
                                          <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400">Товар</th>
                                          <th className="text-right py-2 pr-4 text-slate-500 dark:text-slate-400">Кількість</th>
                                          <th className="text-right py-2 text-slate-500 dark:text-slate-400">Ціна</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orderDetails[order.id].items.map((item) => (
                                          <tr key={item.id} className="border-b dark:border-slate-700/50">
                                            <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">
                                              {item.product_name}
                                            </td>
                                            <td className="py-2 pr-4 text-right text-slate-600 dark:text-slate-400">
                                              {item.quantity}
                                            </td>
                                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                                              {formatCurrency(item.price)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-sm text-slate-400">Завантаження...</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Сторінка {currentPage} з {totalPages} ({totalCount} всього)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchOrders(currentPage - 1)}
              >
                Попередня
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchOrders(currentPage + 1)}
              >
                Наступна
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
