"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "~/i18n/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription, AlertTitle } from "~/ui/primitives/alert";
import { Skeleton } from "~/ui/primitives/skeleton";
import { ArrowLeft, AlertCircle, ShoppingBag } from "lucide-react";
import { useCancelOrder, useOrder } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { getAllowedTransitions } from "~/lib/utils/order-status";
import type { OrderDetail } from "~/lib/types";

export default function MyOrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  if (!id || isNaN(id)) {
    return <OrderNotFoundAlert />;
  }

  return <MyOrderDetailContent id={id} />;
}

function OrderNotFoundAlert() {
  const t = useTranslations("orderDetail");
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("notFound")}</AlertTitle>
        <AlertDescription>{t("notFoundDesc")}</AlertDescription>
      </Alert>
      <div className="mt-4 flex gap-3">
        <Link href="/my/orders">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
        </Link>
        <Link href="/products">
          <Button>
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t("continueShopping")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MyOrderDetailContent({ id }: { id: number }) {
  const t = useTranslations("orderDetail");
  const to = useTranslations("orders");
  const { data: order, error, isLoading, mutate } = useOrder(id);
  const { trigger: cancelOrder } = useCancelOrder();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm(to("cancelConfirm"))) return;
    setCancelling(true);
    try {
      await cancelOrder(id);
      mutate({ ...order, status: "cancelled" } as OrderDetail, { revalidate: false });
      toast.success(to("cancelledSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : to("cancelFailed"));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return <OrderNotFoundAlert />;
  }

  const deliveryLabel =
    order.delivery_method === "pickup" ? t("pickup") :
    order.delivery_method === "nova_poshta" ? t("novaPoshta") :
    order.delivery_method === "courier" ? t("courier") :
    t("deliveryMethod", { method: order.delivery_method });

  const canCancel = getAllowedTransitions(order.status).includes("cancelled");

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/my/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t("back")}
      </Link>

      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className=" text-2xl font-bold tracking-tight text-foreground">
            {t("pageTitle", { id: order.order_number })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("pageSubtitle")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} t={to} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="dark:bg-slate-800/60 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">{t("customerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("name")}</span>
              <span className="text-foreground font-medium">{order.customer_name || t("noName")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("email")}</span>
              <span className="text-foreground font-medium">{order.customer_email || t("noName")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("phone")}</span>
              <span className="text-foreground font-medium">{order.customer_phone || t("noName")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800/60 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">{t("delivery")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("deliveryMethod")}</span>
              <span className="text-foreground font-medium">{deliveryLabel}</span>
            </div>
            {order.shipping_city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("shippingCity")}</span>
                <span className="text-foreground font-medium">{order.shipping_city}</span>
              </div>
            )}
            {order.shipping_address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("shippingAddress")}</span>
                <span className="text-foreground font-medium">{order.shipping_address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dark:bg-slate-800/60 dark:border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-lg">{t("items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700 text-muted-foreground">
                <th className="text-left py-3 font-medium">{t("product")}</th>
                <th className="text-right py-3 font-medium">{t("qty")}</th>
                <th className="text-right py-3 font-medium">{t("price")}</th>
                <th className="text-right py-3 font-medium">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b dark:border-slate-700/50">
                  <td className="py-3 text-foreground">{item.product_name}</td>
                  <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-3 text-right text-foreground">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right text-foreground font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-4 pt-4 border-t dark:border-slate-700">
            <span className="font-semibold text-foreground">{t("total")}</span>
            <span className="font-semibold text-lg text-foreground">{formatCurrency(order.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/products">
          <Button variant="outline">
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t("continueShopping")}
          </Button>
        </Link>
        {canCancel && (
          <Button
            variant="destructive"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? (
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {t("cancelOrder")}
          </Button>
        )}
      </div>
    </div>
  );
}
