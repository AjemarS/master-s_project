"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AdminPageHeader, DataTable, ConfirmDialog } from "../components";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import {
  ShoppingCart,
  ChevronDown,
  Package,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { orderApi } from "~/lib/api/admin-api";
import type { Order, OrderDetail } from "~/lib/types";
import { Badge } from "~/ui/primitives/badge";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import { formatCurrency, formatDate } from "~/lib/utils/format";
import { orderChannelLabel, getAllowedTransitions } from "~/lib/utils/order-status";
import { useOrders, useUpdateOrderStatus } from "~/lib/hooks/use-api-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/ui/primitives/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    open: boolean;
    orderId: number | null;
    status: Order["status"] | null;
    label: string;
  }>({ open: false, orderId: null, status: null, label: "" });

  const { data: pageData, error, isLoading, isValidating, mutate } = useOrders({
    page: currentPage,
    status: statusFilter || undefined,
    channel: channelFilter || undefined,
    search: searchTerm || undefined,
    ordering,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

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
        toast.error(tc("error"), { description: t("loadError") });
      }
    }
  };

  const handleStatusClick = (orderId: number, newStatus: Order["status"], label: string) => {
    setPendingStatus({ open: true, orderId, status: newStatus, label });
  };

  const handleStatusUpdate = async () => {
    const orderId = pendingStatus.orderId;
    const newStatus = pendingStatus.status;
    if (!orderId || !newStatus) return;
    setPendingStatus((prev) => ({ ...prev, open: false }));
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus({ id: orderId, status: newStatus });
      toast.success(t("statusUpdated"), {
        description: t("statusChanged", { id: orderId, status: t(newStatus) }),
      });
      mutate();
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : t("statusUpdateError"),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={ShoppingCart}
          backLabel={tc("back")}
        />

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
        <div className="mb-2 flex flex-wrap gap-2">
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

        {/* Search + Ordering */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchOrders")}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={ordering} onValueChange={(v) => { setOrdering(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_at">{t("newest")}</SelectItem>
              <SelectItem value="created_at">{t("oldest")}</SelectItem>
              <SelectItem value="-total_amount">{t("highestAmount")}</SelectItem>
              <SelectItem value="total_amount">{t("lowestAmount")}</SelectItem>
              <SelectItem value="status">{t("byStatus")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">{t("title")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {tc("count", { count: totalCount })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  id: "order_number",
                  header: t("orderNumber"),
                  cell: (order: Order) => (
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedOrderId === order.id ? "rotate-180" : ""}`} />
                      {order.order_number}
                    </div>
                  ),
                },
                {
                  id: "channel",
                  header: t("channel"),
                  cell: (order: Order) => <Badge variant="outline">{orderChannelLabel(t, order.channel)}</Badge>,
                },
                {
                  id: "status",
                  header: tc("status"),
                  cell: (order: Order) => <OrderStatusBadge status={order.status} />,
                },
                {
                  id: "customer",
                  header: tc("name"),
                  cell: (order: Order) => <span className="text-muted-foreground">{order.customer_name || "—"}</span>,
                },
                {
                  id: "amount",
                  header: t("amount"),
                  cell: (order: Order) => <span className="font-semibold">{formatCurrency(order.total_amount)}</span>,
                },
                {
                  id: "date",
                  header: tc("date"),
                  cell: (order: Order) => <span className="text-muted-foreground text-sm">{formatDate(order.created_at)}</span>,
                },
                {
                  id: "actions",
                  header: tc("actions"),
                  headerClassName: "text-right",
                  cell: (order: Order) => (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingOrderId === order.id}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {updatingOrderId === order.id ? "..." : t(order.status)}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {STATUS_UPDATE_OPTIONS.filter((opt) => getAllowedTransitions(order.status).includes(opt.value)).map((opt) => (
                            <DropdownMenuItem key={opt.value} onClick={() => handleStatusClick(order.id, opt.value as Order["status"], opt.label)}>
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ),
                },
              ]}
              data={orders}
              isLoading={isLoading}
              isValidating={isValidating}
              emptyMessage={t("noOrders")}
              emptyIcon={Package}
              keyExtractor={(o) => o.id}
              expandedId={expandedOrderId}
              onToggleExpand={(id) => handleExpandOrder(id as number)}
              renderExpandedContent={(order) => (
                <div className="pl-8">
                  <h4 className="text-sm font-semibold mb-2">{t("orderItems")}</h4>
                  {orderDetails[order.id] ? (
                    <div className="border rounded-lg dark:border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("product")}</TableHead>
                            <TableHead className="text-right">{tc("quantity")}</TableHead>
                            <TableHead className="text-right">{tc("price")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails[order.id].items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{item.quantity}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tc("loading")}</p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          loading={isLoading}
          onPageChange={(p) => { setCurrentPage(p); mutate(); }}
        />

        <ConfirmDialog
          open={pendingStatus.open}
          onOpenChange={(open) => setPendingStatus((prev) => ({ ...prev, open }))}
          onConfirm={handleStatusUpdate}
          title={t("confirmStatusTitle")}
          description={t("confirmStatusDesc", { id: pendingStatus.orderId ?? 0, status: pendingStatus.label })}
          confirmText={tc("confirm")}
          cancelText={tc("cancel")}
          variant="default"
          loading={updatingOrderId === pendingStatus.orderId}
        />
      </div>
    </div>
  );
}
