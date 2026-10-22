"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "~/i18n/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription, AlertTitle } from "~/ui/primitives/alert";
import { Skeleton } from "~/ui/primitives/skeleton";
import { ArrowLeft, AlertCircle, RotateCcw, ShoppingBag } from "lucide-react";
import { useCancelOrder, useOrder } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";
import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { getAllowedTransitions } from "~/lib/utils/order-status";
import { useApiGet } from "~/lib/hooks/use-api";
import { returnsApi } from "~/lib/api/admin-api";
import type { OrderDetail, OrderItem, ReturnKind, ReturnRequest } from "~/lib/types";
import { ReturnDialog } from "./return-dialog";
import { ReturnStatusBadge } from "~/ui/components/return-status-badge";

// Mirrors order-service returns.py; the server re-checks every claim
const RETURN_DAYS = 14;
const DEFAULT_WARRANTY_MONTHS = 12;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

/** Units of a line still free to claim: rejected claims and finished repairs give units back */
function claimable(item: OrderItem, claims: ReturnRequest[]): number {
  const taken = claims
    .filter((c) => c.item === item.id && c.status !== "rejected" && !(c.status === "resolved" && c.resolution === "repair"))
    .reduce((n, c) => n + c.quantity, 0);
  return item.quantity - taken;
}

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
  const tr = useTranslations("returns");
  const locale = useLocale();
  const [claimItem, setClaimItem] = useState<OrderItem | null>(null);
  const { data: claimsPage, mutate: reloadClaims } = useApiGet(`/returns?order=${id}`, () => returnsApi.list({ order: id }));
  const claims = claimsPage?.results ?? [];

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

  const handedOver = order.status === "delivered" || order.status === "completed";
  const start = new Date(order.delivered_at ?? order.updated_at);
  const now = new Date();
  const returnUntil = new Date(start.getTime() + RETURN_DAYS * 86_400_000);
  const warrantyUntil = (item: OrderItem) => addMonths(start, item.warranty_months ?? DEFAULT_WARRANTY_MONTHS);
  const openKinds = (item: OrderItem): ReturnKind[] => {
    if (!handedOver) return [];
    const kinds: ReturnKind[] = [];
    if (now <= returnUntil) kinds.push("return");
    if (now <= warrantyUntil(item)) kinds.push("warranty");
    return kinds;
  };
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(locale === "en" ? "en-US" : "uk-UA", { day: "numeric", month: "long", year: "numeric" });

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
        <OrderStatusBadge status={order.status} />
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
                {handedOver && <th className="text-right py-3 font-medium">{tr("warrantyUntil")}</th>}
                {handedOver && <th className="py-3"><span className="sr-only">{tr("actions")}</span></th>}
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
                  {handedOver && (
                    <td className="py-3 text-right text-muted-foreground whitespace-nowrap">{fmtDate(warrantyUntil(item))}</td>
                  )}
                  {handedOver && (
                    <td className="py-3 pl-3 text-right">
                      {openKinds(item).length > 0 && claimable(item, claims) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setClaimItem(item)}>
                          <RotateCcw className="h-4 w-4 mr-1" aria-hidden />
                          {tr("fileClaim")}
                        </Button>
                      )}
                    </td>
                  )}
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

      {handedOver && (
        <p className="text-sm text-muted-foreground mb-8">
          {now <= returnUntil
            ? tr("returnOpenUntil", { date: fmtDate(returnUntil) })
            : tr("returnClosed")}
        </p>
      )}

      {claims.length > 0 && (
        <Card className="dark:bg-slate-800/60 dark:border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{tr("myClaims")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y dark:divide-slate-700">
              {claims.map((c) => (
                <li key={c.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-medium text-foreground">
                      {tr(`kind_${c.kind}`)} · {c.product_name} × {c.quantity}
                    </span>
                    <ReturnStatusBadge status={c.status} />
                  </div>
                  {c.resolution && (
                    <p className="text-sm text-muted-foreground">
                      {tr(`resolution_${c.resolution}`)}
                      {c.resolution === "refund" && ` · ${formatCurrency(Number(c.refund_amount))}`}
                    </p>
                  )}
                  {c.admin_comment && <p className="text-sm text-muted-foreground">{tr("storeComment")}: {c.admin_comment}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ReturnDialog
        item={claimItem}
        kinds={claimItem ? openKinds(claimItem) : []}
        maxQuantity={claimItem ? claimable(claimItem, claims) : 0}
        onClose={() => setClaimItem(null)}
        onCreated={() => { setClaimItem(null); reloadClaims(); }}
      />

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
