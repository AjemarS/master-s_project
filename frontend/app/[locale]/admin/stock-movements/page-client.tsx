"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "~/ui/primitives/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { ArrowLeft, ArrowRightLeft, Filter, X, Pencil } from "lucide-react";
import { useStockMovements, useAdjustStock, useWarehouses } from "~/lib/hooks/use-api-data";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import { TableSkeleton } from "../components";

export function StockMovementsClient() {
  const tSM = useTranslations("stockMovements");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const MOVEMENT_TYPES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    receipt: { label: tSM("receipt"), variant: "default" },
    transfer: { label: tSM("transfer"), variant: "secondary" },
    sale: { label: tSM("sale"), variant: "outline" },
    adjustment: { label: tSM("adjustment"), variant: "outline" },
    write_off: { label: tSM("write_off"), variant: "destructive" },
    reserve: { label: tSM("reserve"), variant: "outline" },
    release: { label: tSM("release"), variant: "outline" },
    deduct: { label: tSM("deduct"), variant: "default" },
  };

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterFromWarehouse, setFilterFromWarehouse] = useState("");
  const [filterToWarehouse, setFilterToWarehouse] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustWarehouseId, setAdjustWarehouseId] = useState("");
  const [adjustNewQty, setAdjustNewQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const params: Record<string, string | number | undefined> = { page };
  if (filterType) params.type = filterType;
  if (filterProductId) params.product_id = parseInt(filterProductId, 10);
  if (filterFromWarehouse) params.from_warehouse_id = parseInt(filterFromWarehouse, 10);
  if (filterToWarehouse) params.to_warehouse_id = parseInt(filterToWarehouse, 10);
  if (filterDateFrom) params.created_after = filterDateFrom;
  if (filterDateTo) params.created_before = filterDateTo;

  const { data: movementsData, error: movementsError, isLoading: movementsLoading, mutate: movementsMutate } = useStockMovements(params);
  const { data: warehousesData } = useWarehouses();
  const { trigger: adjustStock, isMutating: adjustSubmitting } = useAdjustStock();

  const movements = movementsData?.results || [];
  const warehouses = warehousesData?.results || [];
  const totalCount = movementsData?.count || 0;

  const handleAdjust = async () => {
    const productId = parseInt(adjustProductId, 10);
    const warehouseId = parseInt(adjustWarehouseId, 10);
    const newQty = parseInt(adjustNewQty, 10);
    if (isNaN(productId) || isNaN(warehouseId) || isNaN(newQty) || newQty < 0) {
      setAdjustError(tSM("adjustStockError"));
      return;
    }
    setAdjustError("");
    try {
      await adjustStock({
        product_id: productId,
        warehouse_id: warehouseId,
        new_quantity: newQty,
        reason: adjustReason,
      });
      setAdjustOpen(false);
      setAdjustProductId("");
      setAdjustWarehouseId("");
      setAdjustNewQty("");
      setAdjustReason("");
      movementsMutate();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : tSM("adjustStockError"));
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> {tCommon("back")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <ArrowRightLeft className="h-10 w-10 text-purple-600" />
                {tSM("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">{tSM("subtitle")}</p>
            </div>
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> {tSM("adjustStockTitle")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{tSM("adjustStockTitle")}</DialogTitle>
                  <DialogDescription>{tSM("adjustStockDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <ErrorAlert message={adjustError} className="mb-0" />
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-product">{tSM("adjustStockProductPlaceholder")}</Label>
                    <Input id="adjust-product" type="number" min="1" placeholder="123" value={adjustProductId} onChange={(e) => setAdjustProductId(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-warehouse">{tSM("adjustStockWarehouse")}</Label>
                    <Select value={adjustWarehouseId} onValueChange={setAdjustWarehouseId}>
                      <SelectTrigger id="adjust-warehouse"><SelectValue placeholder={tSM("adjustStockWarehouse")} /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-qty">{tSM("adjustStockNewQty")}</Label>
                    <Input id="adjust-qty" type="number" min="0" placeholder="0" value={adjustNewQty} onChange={(e) => setAdjustNewQty(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-reason">{tSM("adjustStockReason")}</Label>
                    <Input id="adjust-reason" placeholder={tSM("adjustStockReasonPlaceholder")} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAdjustOpen(false)}>{tCommon("cancel")}</Button>
                  <Button onClick={handleAdjust} disabled={adjustSubmitting}>
                    {adjustSubmitting ? tSM("adjustStockSubmitting") : tSM("adjustStockTitle")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ErrorAlert message={movementsError?.message || null} />

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">{tSM("title")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {totalCount > 0 ? tCommon("count", { count: totalCount }) : tSM("noMovements")}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                {showFilters ? tCommon("close") : tCommon("filter")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("type")}</Label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">{tSM("allTypes")}</option>
                      {Object.entries(MOVEMENT_TYPES).map(([val, info]) => <option key={val} value={val}>{info.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("productId")}</Label>
                    <Input type="number" placeholder="ID" value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)} className="w-28" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("from")}</Label>
                    <select value={filterFromWarehouse} onChange={(e) => setFilterFromWarehouse(e.target.value)} className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">{tSM("all")}</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("to")}</Label>
                    <select value={filterToWarehouse} onChange={(e) => setFilterToWarehouse(e.target.value)} className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">{tSM("all")}</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tCommon("dateFrom")}</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tCommon("dateTo")}</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-40" />
                  </div>
                  <Button size="sm" onClick={() => setPage(1)}>{tCommon("apply")}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setFilterType(""); setFilterProductId(""); setFilterFromWarehouse(""); setFilterToWarehouse(""); setFilterDateFrom(""); setFilterDateTo(""); setPage(1); }}>
                    {tCommon("reset")}
                  </Button>
                </div>
              </div>
            )}

            {movementsLoading ? (
              <TableSkeleton rows={8} cols={8} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("id")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("type")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("productId")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("from")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("to")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("quantity")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("date")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tSM("user")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {tSM("noMovements")}
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const typeInfo = MOVEMENT_TYPES[m.type] || { label: m.type, variant: "outline" as const };
                        return (
                          <tr key={m.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{m.id}</td>
                            <td className="p-4"><Badge variant={typeInfo.variant}>{typeInfo.label}</Badge></td>
                            <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-400">#{m.product_id}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{m.from_warehouse_name || "—"}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{m.to_warehouse_name || "—"}</td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{m.quantity}</td>
                            <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(m.created_at)}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{m.created_by || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / 20)}
          totalCount={totalCount}
          loading={movementsLoading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
