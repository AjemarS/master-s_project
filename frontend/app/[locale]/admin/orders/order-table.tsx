"use client";

import { useTranslations } from "next-intl";
import { Package, ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { DataTable, type Column } from "../components";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { formatCurrency, formatDate } from "~/lib/utils/format";
import { orderChannelLabel, getAllowedTransitions } from "~/lib/utils/order-status";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/ui/primitives/dropdown-menu";
import type { Order, OrderDetail } from "~/lib/types";

interface OrderTableProps {
  orders: Order[];
  totalCount: number;
  isLoading: boolean;
  isValidating: boolean;
  expandedOrderId: number | null;
  orderDetails: Record<number, OrderDetail>;
  updatingOrderId: number | null;
  onToggleExpand: (orderId: number) => void;
  onStatusClick: (orderId: number, newStatus: Order["status"], label: string) => void;
}

export function OrderTable({
  orders,
  totalCount,
  isLoading,
  isValidating,
  expandedOrderId,
  orderDetails,
  updatingOrderId,
  onToggleExpand,
  onStatusClick,
}: OrderTableProps) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");

  const STATUS_UPDATE_OPTIONS = [
    { value: "unpaid", label: t("unpaid") },
    { value: "paid", label: t("paid") },
    { value: "delivering", label: t("delivering") },
    { value: "delivered", label: t("delivered") },
    { value: "completed", label: t("completed") },
    { value: "cancelled", label: t("cancelled") },
  ] as const;

  const columns: Column<Order>[] = [
    {
      id: "order_number",
      header: t("id"),
      cell: (order: Order) => (
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${expandedOrderId === order.id ? "rotate-180" : ""}`}
          />
          {order.order_number}
        </div>
      ),
    },
    {
      id: "channel",
      header: t("channel"),
      cell: (order: Order) => (
        <Badge variant="outline">{orderChannelLabel(t, order.channel)}</Badge>
      ),
    },
    {
      id: "status",
      header: tc("status"),
      cell: (order: Order) => <OrderStatusBadge status={order.status} />,
    },
    {
      id: "customer",
      header: tc("name"),
      cell: (order: Order) => (
        <span className="text-muted-foreground">{order.customer_name || "—"}</span>
      ),
    },
    {
      id: "amount",
      header: t("amount"),
      cell: (order: Order) => (
        <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
      ),
    },
    {
      id: "date",
      header: tc("date"),
      cell: (order: Order) => (
        <span className="text-muted-foreground text-sm">{formatDate(order.created_at)}</span>
      ),
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
              {STATUS_UPDATE_OPTIONS.filter((opt) =>
                getAllowedTransitions(order.status).includes(opt.value),
              ).map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() =>
                    onStatusClick(order.id, opt.value as Order["status"], opt.label)
                  }
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
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
          columns={columns}
          data={orders}
          isLoading={isLoading}
          isValidating={isValidating}
          emptyMessage={t("noOrders")}
          emptyIcon={Package}
          keyExtractor={(o: Order) => o.id}
          expandedId={expandedOrderId}
          onToggleExpand={(id) => onToggleExpand(id as number)}
          renderExpandedContent={(order: Order) => (
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
                          <TableCell className="text-right text-muted-foreground">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(item.price)}
                          </TableCell>
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
  );
}
