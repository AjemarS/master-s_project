"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "~/ui/primitives/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { ArrowRightLeft, Filter, X, Pencil, AlertTriangle, Loader2 } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useStockMovements, useAdjustStock, useWarehouses } from "~/lib/hooks/use-api-data";
import { stockApi, productApi } from "~/lib/api/admin-api";
import type { Product } from "~/lib/types";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from "../components";

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

  const [stockData, setStockData] = useState<{
    productId: number; warehouseId: number;
    quantity: number; reserved: number; available: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (productSearch.length < 2) {
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    let cancelled = false;
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      setProductResults([]);
      try {
        const res = await productApi.getAll({ search: productSearch, pageSize: 10 });
        if (cancelled) return;
        if (!res.error && res.data?.results) {
          setProductResults(res.data.results);
        }
      } catch { /* ignore */ }
      if (!cancelled) setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [productSearch]);

  // Derive loading from ID mismatch — avoids synchronous setState in effect body
  const pid = parseInt(adjustProductId, 10);
  const wid = parseInt(adjustWarehouseId, 10);
  const hasValidIds = !isNaN(pid) && !isNaN(wid);
  const stockLoading = hasValidIds && (
    stockData === null ||
    stockData.productId !== pid ||
    stockData.warehouseId !== wid
  );

  useEffect(() => {
    const currentPid = parseInt(adjustProductId, 10);
    const currentWid = parseInt(adjustWarehouseId, 10);
    if (isNaN(currentPid) || isNaN(currentWid)) return;
    let cancelled = false;
    stockApi.getAll({ product_id: currentPid, warehouse_id: currentWid })
      .then(res => {
        if (cancelled) return;
        if (res.error) return;
        const stocks = res.data?.results || [];
        const match = stocks.find(s => s.product_id === currentPid && s.warehouse === currentWid);
        setStockData({
          productId: currentPid,
          warehouseId: currentWid,
          ...match
            ? { quantity: match.quantity, reserved: match.reserved, available: match.available }
            : { quantity: 0, reserved: 0, available: 0 },
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [adjustProductId, adjustWarehouseId]);

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

  const movements = useMemo(() => movementsData?.results || [], [movementsData?.results]);
  const warehouses = useMemo(() => warehousesData?.results || [], [warehousesData?.results]);
  const totalCount = movementsData?.count || 0;

  const warehouseName = useMemo(() => {
    const wid = parseInt(adjustWarehouseId, 10);
    const wh = warehouses?.find(w => w.id === wid);
    return wh?.name || null;
  }, [adjustWarehouseId, warehouses]);

  const newQtyNum = parseInt(adjustNewQty, 10);
  const available = stockData?.available ?? 0;
  const diff = !isNaN(newQtyNum) ? newQtyNum - available : 0;
  const diffPercent = available > 0 ? (Math.abs(diff) / available) * 100 : 0;

  const handleContinue = () => {
    const productId = parseInt(adjustProductId, 10);
    const warehouseId = parseInt(adjustWarehouseId, 10);
    const newQty = parseInt(adjustNewQty, 10);
    if (isNaN(productId) || isNaN(warehouseId) || isNaN(newQty) || newQty < 0) {
      setAdjustError(tSM("adjustStockError"));
      return;
    }
    setAdjustError("");
    setShowConfirm(true);
  };

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
      setShowConfirm(false);
      setStockData(null);
      movementsMutate();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : tSM("adjustStockError"));
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={tSM("title")}
          subtitle={tSM("subtitle")}
          icon={ArrowRightLeft}
          backLabel={tCommon("back")}
          actions={
            <Dialog open={adjustOpen} onOpenChange={(open) => {
              setAdjustOpen(open);
              if (!open) {
                setShowConfirm(false);
                setStockData(null);
                setAdjustError("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> {tSM("adjustStockTitle")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{showConfirm ? tSM("confirmAdjustTitle") : tSM("adjustStockTitle")}</DialogTitle>
                  <DialogDescription>{showConfirm ? tSM("adjustStockDesc") : tSM("adjustStockDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <ErrorAlert message={adjustError} className="mb-0" />
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-product">{tSM("adjustStockProductPlaceholder")}</Label>
                    <div className="relative">
                      <Input
                        id="adjust-product"
                        placeholder={tCommon("searchProducts")}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        disabled={showConfirm}
                      />
                      {searching && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {productSearch.length >= 2 && productResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {productResults.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                              onClick={() => {
                                setProductSearch(`${p.name} (#${p.id})`);
                                setAdjustProductId(String(p.id));
                                setProductResults([]);
                              }}
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground ml-2">#{p.id}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-warehouse">{tSM("adjustStockWarehouse")}</Label>
                    <Select value={adjustWarehouseId} onValueChange={setAdjustWarehouseId} disabled={showConfirm}>
                      <SelectTrigger id="adjust-warehouse"><SelectValue placeholder={tSM("adjustStockWarehouse")} /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-qty">{tSM("adjustStockNewQty")}</Label>
                    <Input id="adjust-qty" type="number" min="0" placeholder="0" value={adjustNewQty} onChange={(e) => setAdjustNewQty(e.target.value)} disabled={showConfirm} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="adjust-reason">{tSM("adjustStockReason")}</Label>
                    <Input id="adjust-reason" placeholder={tSM("adjustStockReasonPlaceholder")} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} disabled={showConfirm} />
                  </div>

                  {showConfirm && (
                    <div className="space-y-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                      <h4 className="font-semibold text-sm">{tSM("confirmAdjustTitle")}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{tSM("adjustStockProductPlaceholder")}:</span>
                        <span className="font-medium">#{parseInt(adjustProductId, 10)}</span>
                        <span className="text-muted-foreground">{tSM("adjustStockWarehouse")}:</span>
                        <span className="font-medium">{warehouseName || adjustWarehouseId}</span>
                        <span className="text-muted-foreground">{tSM("currentQty")}:</span>
                        <span className="font-medium">
                          {stockLoading ? (
                            <span className="text-muted-foreground">...</span>
                          ) : stockData ? (
                            <span>
                              {stockData.available}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({stockData.quantity} - {stockData.reserved} = {stockData.available})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{tSM("stockFetchError")}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">{tSM("newQty")}:</span>
                        <span className="font-medium">{adjustNewQty}</span>
                        <span className="text-muted-foreground">{tSM("difference")}:</span>
                        <span className={`font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      </div>
                      {newQtyNum === 0 && (
                        <div className="text-amber-600 text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{tSM("writeOffWarning")}</span>
                        </div>
                      )}
                      {stockData && diffPercent > 20 && (
                        <div className="text-amber-600 text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{tSM("largeAdjustWarning")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="sm:justify-between">
                  {showConfirm ? (
                    <>
                      <Button variant="outline" onClick={() => setShowConfirm(false)}>{tSM("back")}</Button>
                      <Button onClick={handleAdjust} disabled={adjustSubmitting}>
                        {adjustSubmitting ? tSM("adjustStockSubmitting") : tSM("confirmAdjust")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setAdjustOpen(false)}>{tCommon("cancel")}</Button>
                      <Button onClick={handleContinue} disabled={!adjustProductId || !adjustWarehouseId || !adjustNewQty || stockLoading}>
                        {tSM("continue")}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

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
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-44"><SelectValue placeholder={tSM("allTypes")} /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MOVEMENT_TYPES).map(([val, info]) => <SelectItem key={val} value={val}>{info.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("productId")}</Label>
                    <Input type="number" placeholder="ID" value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)} className="w-28" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("from")}</Label>
                    <Select value={filterFromWarehouse} onValueChange={setFilterFromWarehouse}>
                      <SelectTrigger className="w-44"><SelectValue placeholder={tSM("all")} /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">{tSM("to")}</Label>
                    <Select value={filterToWarehouse} onValueChange={setFilterToWarehouse}>
                      <SelectTrigger className="w-44"><SelectValue placeholder={tSM("all")} /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
              <div className="border rounded-lg dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <TableHead>{tSM("id")}</TableHead>
                      <TableHead>{tSM("type")}</TableHead>
                      <TableHead>{tSM("productId")}</TableHead>
                      <TableHead>{tSM("from")}</TableHead>
                      <TableHead>{tSM("to")}</TableHead>
                      <TableHead>{tSM("quantity")}</TableHead>
                      <TableHead>{tSM("date")}</TableHead>
                      <TableHead>{tSM("user")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <EmptyState icon={ArrowRightLeft} message={tSM("noMovements")} colSpan={8} />
                    ) : (
                      movements.map((m) => {
                        const typeInfo = MOVEMENT_TYPES[m.type] || { label: m.type, variant: "outline" as const };
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">#{m.id}</TableCell>
                            <TableCell><Badge variant={typeInfo.variant}>{typeInfo.label}</Badge></TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">#{m.product_id}</TableCell>
                            <TableCell className="text-muted-foreground">{m.from_warehouse_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{m.to_warehouse_name || "—"}</TableCell>
                            <TableCell className="font-semibold">{m.quantity}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                            <TableCell className="text-muted-foreground">{m.created_by || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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
