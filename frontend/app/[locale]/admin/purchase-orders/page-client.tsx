"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ClipboardList, PackageCheck, Send, XCircle } from "lucide-react";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Checkbox } from "~/ui/primitives/checkbox";
import { Input } from "~/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/primitives/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";
import { AdminPageHeader, ConfirmDialog, EmptyState, TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useApiGet } from "~/lib/hooks/use-api";
import { useSuppliers, useWarehouses } from "~/lib/hooks/use-api-data";
import { useCurrentUser } from "~/lib/auth-client";
import { productApi, purchaseOrderApi, stockApi } from "~/lib/api/admin-api";
import { apiErrorText } from "~/lib/utils/error-handler";
import { formatCurrency } from "~/lib/utils/format";
import type { PurchaseOrder, PurchaseOrderStatus, ReorderSuggestion } from "~/lib/types";
import { GoodsReceiptDialog } from "../goods-receipts/goods-receipt-dialog";

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  partially_received: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};
const FILTERS: (PurchaseOrderStatus | "all")[] = ["all", "draft", "sent", "partially_received", "received", "cancelled"];

/** One batched lookup for the names inventory-service does not know */
function useProductNames(ids: number[]) {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const { data } = useApiGet(sorted.length ? `/products?ids=${sorted.join(",")}` : null, () =>
    productApi.getAll({ ids: sorted.join(","), pageSize: 100 })
  );
  return (id: number) => data?.results.find((p) => p.id === id)?.name ?? `#${id}`;
}

function Suggestions({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("purchasing");
  const { data: whData } = useWarehouses();
  const { data: supData } = useSuppliers();
  const warehouses = whData?.results ?? [];
  const suppliers = supData?.results ?? [];
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const { data, error, isLoading, mutate } = useApiGet<ReorderSuggestion[]>(`/stock/reorder-suggestions?${warehouseId}`, () =>
    stockApi.reorderSuggestions(warehouseId === "all" ? undefined : Number(warehouseId))
  );
  const rows = useMemo(() => data ?? [], [data]);
  const nameOf = useProductNames(rows.map((r) => r.product_id));

  // Per-row overrides; default: every row picked, suggested quantity, last supplier
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [qty, setQty] = useState<Record<number, string>>({});
  const [supplierFor, setSupplierFor] = useState<Record<number, string>>({});
  const [creating, setCreating] = useState(false);

  const supplierOf = (r: ReorderSuggestion) => supplierFor[r.stock_id] ?? (r.last_supplier_id ? String(r.last_supplier_id) : "");
  const picked = rows.filter((r) => !skip.has(r.stock_id));
  const missingSupplier = picked.some((r) => !supplierOf(r));

  const createDrafts = async () => {
    // One draft per supplier and warehouse: that is what a supplier receives as one order
    const groups = new Map<string, ReorderSuggestion[]>();
    for (const r of picked) {
      const key = `${supplierOf(r)}|${r.warehouse_id}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    setCreating(true);
    let made = 0;
    for (const [key, group] of groups) {
      const [supplier, warehouse] = key.split("|").map(Number);
      const res = await purchaseOrderApi.create({
        supplier, warehouse,
        items: group.map((r) => ({
          product_id: r.product_id,
          quantity: Math.max(1, Number(qty[r.stock_id] ?? r.suggested_quantity) || 1),
          unit_cost: r.last_cost_price ?? "0",
        })),
      });
      if (res.error) toast.error(apiErrorText(res.error));
      else made += 1;
    }
    setCreating(false);
    if (made) toast.success(t("draftsCreated", { count: made }));
    setSkip(new Set());
    setQty({});
    mutate();
    onCreated();
  };

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>{t("suggestionsTitle")}</CardTitle>
          <CardDescription>{t("suggestionsDesc")}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-48" aria-label={t("warehouse")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allWarehouses")}</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={createDrafts} disabled={!picked.length || missingSupplier || creating}>
            <ClipboardList className="h-4 w-4" aria-hidden />
            {t("createDrafts", { count: picked.length })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ErrorAlert message={error?.message ?? null} />
        {missingSupplier && <p className="mb-3 text-sm text-destructive" role="alert">{t("pickSupplier")}</p>}
        {isLoading && !data ? <TableSkeleton rows={4} cols={7} /> : (
          <div className="border rounded-lg dark:border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"><span className="sr-only">{t("pick")}</span></TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("warehouse")}</TableHead>
                  <TableHead className="text-right">{t("availableVsPoint")}</TableHead>
                  <TableHead className="text-right">{t("onOrder")}</TableHead>
                  <TableHead className="text-right">{t("orderQty")}</TableHead>
                  <TableHead>{t("supplier")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? <EmptyState icon={PackageCheck} message={t("nothingToReorder")} colSpan={7} /> : rows.map((r) => (
                  <TableRow key={r.stock_id} className={skip.has(r.stock_id) ? "opacity-50" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={!skip.has(r.stock_id)}
                        onCheckedChange={(v) => setSkip((prev) => { const n = new Set(prev); if (v) n.delete(r.stock_id); else n.add(r.stock_id); return n; })}
                        aria-label={t("pickNamed", { name: nameOf(r.product_id) })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{nameOf(r.product_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.warehouse_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={r.available <= 0 ? "text-destructive font-semibold" : undefined}>{r.available}</span>
                      <span className="text-muted-foreground"> / {r.reorder_point}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.on_order + r.in_draft || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={1} className="h-8 w-20 ml-auto" value={qty[r.stock_id] ?? String(r.suggested_quantity)}
                        onChange={(e) => setQty((prev) => ({ ...prev, [r.stock_id]: e.target.value }))}
                        aria-label={t("orderQtyFor", { name: nameOf(r.product_id) })} />
                    </TableCell>
                    <TableCell>
                      <Select value={supplierOf(r)} onValueChange={(v) => setSupplierFor((prev) => ({ ...prev, [r.stock_id]: v }))}>
                        <SelectTrigger className="h-8 w-44" aria-label={t("supplierFor", { name: nameOf(r.product_id) })}>
                          <SelectValue placeholder={t("chooseSupplier")} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {r.last_cost_price && <div className="text-xs text-muted-foreground mt-1">{t("lastCost", { price: formatCurrency(Number(r.last_cost_price)) })}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Orders({ reloadKey }: { reloadKey: number }) {
  const t = useTranslations("purchasing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [filter, setFilter] = useState<PurchaseOrderStatus | "all">("all");
  const { data, error, isLoading, mutate } = useApiGet(`/purchase-orders?${filter}&r=${reloadKey}`, () =>
    purchaseOrderApi.list(filter === "all" ? undefined : { status: filter })
  );
  const orders = data?.results ?? [];
  const nameOf = useProductNames(orders.flatMap((o) => o.items.map((i) => i.product_id)));
  const { data: whData } = useWarehouses();
  const { data: supData } = useSuppliers();

  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);

  const setStatus = async (po: PurchaseOrder, status: "sent" | "cancelled") => {
    const res = await purchaseOrderApi.setStatus(po.id, status);
    if (res.error) toast.error(apiErrorText(res.error));
    else { toast.success(t(status === "sent" ? "sentDone" : "cancelledDone")); mutate(); }
    setCancelling(null);
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "uk-UA", { day: "numeric", month: "short" }) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="group" aria-label={t("filterByStatus")}>
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={f === filter ? "secondary" : "ghost"} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f === "all" ? t("all") : t(`status_${f}`)}
          </Button>
        ))}
      </div>
      <ErrorAlert message={error?.message ?? null} />
      {isLoading && !data ? <TableSkeleton rows={5} cols={6} /> : (
        <div className="border rounded-lg dark:border-border overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>№</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? <EmptyState icon={ClipboardList} message={t("noOrders")} colSpan={6} /> : orders.map((po) => (
                <TableRow key={po.id} className="align-top">
                  <TableCell className="font-mono text-xs">
                    PO-{po.id}
                    <div className="text-muted-foreground">{fmtDate(po.created_at)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{po.supplier_name}</div>
                    <div className="text-xs text-muted-foreground">{po.warehouse_name}</div>
                  </TableCell>
                  <TableCell>
                    <ul className="text-sm space-y-0.5">
                      {po.items.map((i) => (
                        <li key={i.product_id}>
                          {nameOf(i.product_id)} × {i.quantity}
                          {!!i.received_quantity && (
                            <span className="text-muted-foreground"> · {t("receivedOf", { received: i.received_quantity, total: i.quantity })}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(Number(po.total_amount))}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[po.status]}`}>{t(`status_${po.status}`)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {isAdmin && po.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(po, "sent")}>
                          <Send className="h-4 w-4" aria-hidden />{t("send")}
                        </Button>
                      )}
                      {(po.status === "sent" || po.status === "partially_received") && (
                        <Button size="sm" variant="outline" onClick={() => setReceiving(po)}>
                          <PackageCheck className="h-4 w-4" aria-hidden />{t("receive")}
                        </Button>
                      )}
                      {isAdmin && ["draft", "sent", "partially_received"].includes(po.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelling(po)} aria-label={t("cancelNamed", { id: po.id })}>
                          <XCircle className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {receiving && (
        <GoodsReceiptDialog
          key={receiving.id}
          open
          onOpenChange={(o) => { if (!o) setReceiving(null); }}
          suppliers={supData?.results ?? []}
          warehouses={whData?.results ?? []}
          purchaseOrder={receiving}
          onSuccess={() => { setReceiving(null); mutate(); }}
        />
      )}

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => { if (!o) setCancelling(null); }}
        onConfirm={() => cancelling && setStatus(cancelling, "cancelled")}
        title={t("cancelTitle")}
        description={cancelling?.status === "partially_received" ? t("cancelPartialDesc") : t("cancelDesc")}
        confirmText={t("cancelConfirm")}
        cancelText={tc("cancel")}
        variant="destructive"
      />
    </div>
  );
}

export function PurchaseOrdersClient() {
  const t = useTranslations("purchasing");
  const tc = useTranslations("common");
  // Drafts made from suggestions show up in the orders tab without a manual refresh
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="min-h-dvh bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader title={t("title")} subtitle={t("subtitle")} icon={ClipboardList} backLabel={tc("back")} />
        <Tabs defaultValue="suggestions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suggestions">{t("tabSuggestions")}</TabsTrigger>
            <TabsTrigger value="orders">{t("tabOrders")}</TabsTrigger>
          </TabsList>
          <TabsContent value="suggestions"><Suggestions onCreated={() => setReloadKey((k) => k + 1)} /></TabsContent>
          <TabsContent value="orders"><Orders reloadKey={reloadKey} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
