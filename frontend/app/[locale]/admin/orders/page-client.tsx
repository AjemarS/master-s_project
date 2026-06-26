"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import type { Order, OrderDetail } from "~/lib/types";
import { TableSkeleton } from "../components/loading-skeleton";
import { Badge } from "~/ui/primitives/badge";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import { formatCurrency, formatDate } from "~/lib/utils/format";
import { orderStatusLabel, orderChannelLabel } from "~/lib/utils/order-status";
import { useOrders, useUpdateOrderStatus } from "~/lib/hooks/use-api-data";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/ui/primitives/dropdown-menu";

const PAGE_SIZE = 20;

function useOrdersTabs(t: (key: string) => string) {
  return {
    CHANNEL_TABS: [
      { value: "", label: t("allChannels") },
      { value: "online", label: t("online") },
      { value: "offline", label: t("offline") },
    ] as const,
    STATUS_TABS: [
      { value: "", label: t("allStatuses") },
      { value: "unpaid", label: t("unpaid") },
      { value: "paid", label: t("paid") },
      { value: "delivering", label: t("delivering") },
      { value: "delivered", label: t("delivered") },
      { value: "completed", label: t("completed") },
      { value: "cancelled", label: t("cancelled") },
    ] as const,
    STATUS_UPDATE_OPTIONS: [
      { value: "unpaid", label: t("unpaid") },
      { value: "paid", label: t("paid") },
      { value: "delivering", label: t("delivering") },
      { value: "delivered", label: t("delivered") },
      { value: "completed", label: t("completed") },
      { value: "cancelled", label: t("cancelled") },
    ] as const,
  };
}

export function AdminOrdersClient() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const { CHANNEL_TABS, STATUS_TABS, STATUS_UPDATE_OPTIONS } = useOrdersTabs(t);

  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const { data: pageData, error, isLoading, mutate } = useOrders({
    page: currentPage,
    status: statusFilter || undefined,
    channel: channelFilter || undefined,
  });

  const { trigger: updateOrderStatus } = useUpdateOrderStatus();

  const orders = pageData?.results || [];
  const totalCount = pageData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
        toast.error(tc("error"), { description: "Не вдалося завантажити деталі замовлення" });
      }
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: Order["status"]) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus({ id: orderId, status: newStatus });
      toast.success(t("statusUpdated"), {
        description: `Статус замовлення #${orderId} змінено на "${orderStatusLabel(newStatus)}"`,
      });
      mutate();
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : "Не вдалося оновити статус",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <ShoppingCart className="h-10 w-10 text-purple-600" />
                {t("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        <ErrorAlert message={error?.message || null} />

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
                <CardTitle className="dark:text-slate-100">{t("title")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {tc("count", { count: totalCount })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("orderNumber")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("channel")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("status")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("name")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("amount")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("date")}</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {t("noOrders")}
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
                                {orderChannelLabel(order.channel)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <OrderStatusBadge status={order.status} />
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
                                      {updatingOrderId === order.id ? "..." : orderStatusLabel(order.status)}
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
                                    {t("orderItems")}
                                  </h4>
                                  {orderDetails[order.id] ? (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b dark:border-slate-700">
                                          <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400">{t("product")}</th>
                                          <th className="text-right py-2 pr-4 text-slate-500 dark:text-slate-400">{tc("quantity")}</th>
                                          <th className="text-right py-2 text-slate-500 dark:text-slate-400">{tc("price")}</th>
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
                                    <p className="text-sm text-slate-400">{tc("loading")}</p>
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          loading={isLoading}
          onPageChange={(p) => { setCurrentPage(p); mutate(); }}
        />
      </div>
    </div>
  );
}
