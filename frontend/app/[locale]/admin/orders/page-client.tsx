"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { AdminPageHeader, ConfirmDialog } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import { useOrders } from "~/lib/hooks/use-api-data";
import { orderService } from "./actions";
import type { Order, OrderDetail } from "~/lib/types";
import { OrderFilters } from "./order-filters";
import { OrderTable } from "./order-table";

const PAGE_SIZE = 20;

export function AdminOrdersClient() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");

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

  const orders = pageData?.results || [];
  const totalCount = pageData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (value: string) => {
      setter(value);
      setCurrentPage(1);
    },
    [],
  );

  const handleExpandOrder = async (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderDetails[orderId]) {
      try {
        const response = await orderService.getById(orderId);
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
      const res = await orderService.updateStatus(orderId, newStatus);
      if (res.error) throw new Error(res.error.message);
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

        <OrderFilters
          currentStatus={statusFilter}
          currentChannel={channelFilter}
          searchTerm={searchTerm}
          ordering={ordering}
          onStatusChange={handleFilterChange(setStatusFilter)}
          onChannelChange={handleFilterChange(setChannelFilter)}
          onSearchChange={handleFilterChange(setSearchTerm)}
          onOrderingChange={handleFilterChange(setOrdering)}
        />

        <OrderTable
          orders={orders}
          totalCount={totalCount}
          isLoading={isLoading}
          isValidating={isValidating}
          expandedOrderId={expandedOrderId}
          orderDetails={orderDetails}
          updatingOrderId={updatingOrderId}
          onToggleExpand={handleExpandOrder}
          onStatusClick={handleStatusClick}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          loading={isLoading}
          onPageChange={(p) => {
            setCurrentPage(p);
            mutate();
          }}
        />

        <ConfirmDialog
          open={pendingStatus.open}
          onOpenChange={(open) => setPendingStatus((prev) => ({ ...prev, open }))}
          onConfirm={handleStatusUpdate}
          title={t("confirmStatusTitle")}
          description={t("confirmStatusDesc", {
            id: pendingStatus.orderId ?? 0,
            status: pendingStatus.label,
          })}
          confirmText={tc("confirm")}
          cancelText={tc("cancel")}
          variant="default"
          loading={updatingOrderId === pendingStatus.orderId}
        />
      </div>
    </div>
  );
}
