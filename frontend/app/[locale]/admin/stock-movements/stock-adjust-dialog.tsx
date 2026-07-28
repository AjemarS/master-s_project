"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, startTransition } from "react";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import { Button } from "~/ui/primitives/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useAdjustStock, useWarehouses } from "~/lib/hooks/use-api-data";
import { stockMovementService } from "./actions";
import type { Product } from "~/lib/types";
import { useActivityFeed } from "../components/activity-feed";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockAdjustDialog({ open, onOpenChange, onSuccess }: StockAdjustDialogProps) {
  const { pushEvent } = useActivityFeed();
  const tSM = useTranslations("stockMovements");
  const tCommon = useTranslations("common");

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const [stockData, setStockData] = useState<{
    productId: number; warehouseId: number;
    quantity: number; reserved: number; available: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stockedWarehouses, setStockedWarehouses] = useState<Set<number> | null>(null);
  const stockedLoading = !!productId && stockedWarehouses === null;

  const { data: warehousesData } = useWarehouses();
  const { trigger: adjustStock, isMutating: adjustSubmitting } = useAdjustStock();

  const warehouses = warehousesData?.results || [];
  const pid = parseInt(productId, 10);
  const wid = parseInt(warehouseId, 10);
  const hasValidIds = !isNaN(pid) && !isNaN(wid);
  const stockLoading = hasValidIds && (
    stockData === null ||
    stockData.productId !== pid ||
    stockData.warehouseId !== wid
  );

  const warehouseName = warehouses?.find(w => w.id === wid)?.name || null;

  const newQtyNum = parseInt(newQty, 10);
  const available = stockData?.available ?? 0;
  const diff = !isNaN(newQtyNum) ? newQtyNum - available : 0;
  const diffPercent = available > 0 ? (Math.abs(diff) / available) * 100 : 0;

  // Product search with debounce
  useEffect(() => {
    if (productSearch.length < 2) {
      startTransition(() => setProductResults([]));
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    let cancelled = false;
    searchTimeoutRef.current = setTimeout(async () => {
      const idMatch = productSearch.match(/^#(\d+)$/);
      if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        startTransition(() => setSearching(true));
        try {
          const res = await stockMovementService.getProductById(id);
          if (cancelled) return;
          startTransition(() => setProductResults(res.data ? [res.data] : []));
        } catch {
          if (!cancelled) startTransition(() => setProductResults([]));
        }
        if (!cancelled) setSearching(false);
        return;
      }

      startTransition(() => setSearching(true));
      startTransition(() => setProductResults([]));
      try {
        const res = await stockMovementService.searchProducts(productSearch);
        if (cancelled) return;
        const results = res.data?.results;
        if (!res.error && results) {
          startTransition(() => setProductResults(results));
        }
      } catch { /* ignore */ }
      if (!cancelled) setSearching(false);
    }, 150);
    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [productSearch]);

  // Fetch which warehouses stock the selected product
  useEffect(() => {
    const pid = productId ? parseInt(productId, 10) : NaN;
    if (isNaN(pid)) return;
    startTransition(() => setStockedWarehouses(null));
    let cancelled = false;
    stockMovementService.getStock({ product_id: pid })
      .then(res => {
        if (cancelled) return;
        if (res.error) { setStockedWarehouses(new Set()); return; }
        const warehouseIds = new Set<number>(res.data?.map(s => s.warehouse) ?? []);
        setStockedWarehouses(warehouseIds);
        const currentWid = parseInt(warehouseId, 10);
        if (!isNaN(currentWid) && warehouseIds.size > 0 && !warehouseIds.has(currentWid)) {
          setWarehouseId("");
        }
      })
      .catch(() => { if (!cancelled) setStockedWarehouses(new Set()); });
    return () => { cancelled = true; };
  }, [productId, warehouseId]);

  // Load current stock when product and warehouse are selected
  useEffect(() => {
    const currentPid = parseInt(productId, 10);
    const currentWid = parseInt(warehouseId, 10);
    if (isNaN(currentPid) || isNaN(currentWid)) return;
    let cancelled = false;
    stockMovementService.getStock({ product_id: currentPid, warehouse_id: currentWid })
      .then(res => {
        if (cancelled) return;
        if (res.error) return;
        const stocks = res.data || [];
        const match = stocks.find(s => s.product_id === currentPid && s.warehouse === currentWid);
        const qty = match ? match.quantity : 0;
        setStockData({
          productId: currentPid,
          warehouseId: currentWid,
          ...match
            ? { quantity: qty, reserved: match.reserved, available: match.available }
            : { quantity: 0, reserved: 0, available: 0 },
        });
        setNewQty(String(qty));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productId, warehouseId]);

  const handleClose = () => {
    setShowConfirm(false);
    setStockData(null);
    setError("");
    setProductSearch("");
    setProductId("");
    setWarehouseId("");
    setNewQty("");
    setReason("");
    setProductResults([]);
    setStockedWarehouses(null);
    onOpenChange(false);
  };

  const handleContinue = () => {
    const parsedProductId = parseInt(productId, 10);
    const parsedWarehouseId = parseInt(warehouseId, 10);
    const parsedNewQty = parseInt(newQty, 10);
    if (isNaN(parsedProductId) || isNaN(parsedWarehouseId) || isNaN(parsedNewQty) || parsedNewQty < 0) {
      setError(tSM("adjustStockError"));
      return;
    }
    setError("");
    setShowConfirm(true);
  };

  const handleAdjust = async () => {
    const parsedProductId = parseInt(productId, 10);
    const parsedWarehouseId = parseInt(warehouseId, 10);
    const parsedNewQty = parseInt(newQty, 10);
    if (isNaN(parsedProductId) || isNaN(parsedWarehouseId) || isNaN(parsedNewQty) || parsedNewQty < 0) {
      setError(tSM("adjustStockError"));
      return;
    }
    setError("");
    try {
      await adjustStock({
        product_id: parsedProductId,
        warehouse_id: parsedWarehouseId,
        new_quantity: parsedNewQty,
        reason,
      });
      pushEvent({ type: "info", message: `Adjusted stock in stock-movements panel`, entityType: "stock_movement" });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : tSM("adjustStockError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{showConfirm ? tSM("confirmAdjustTitle") : tSM("adjustStockTitle")}</DialogTitle>
          <DialogDescription>{tSM("adjustStockDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ErrorAlert message={error} className="mb-0" />
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
                <div className="absolute z-10 mt-1 w-full bg-background dark:bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {productResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                      onClick={() => {
                        setProductSearch(`${p.name} (#${p.id})`);
                        setProductId(String(p.id));
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
            <Select value={warehouseId} onValueChange={setWarehouseId} disabled={showConfirm}>
              <SelectTrigger id="adjust-warehouse">
                <SelectValue placeholder={stockedLoading ? "Loading\u2026" : tSM("adjustStockWarehouse")} />
                {stockedLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </SelectTrigger>
              <SelectContent>
                {(stockedWarehouses && stockedWarehouses.size > 0
                  ? warehouses.filter(w => stockedWarehouses.has(w.id))
                  : warehouses
                ).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {productId && warehouseId && (
            <div className="grid gap-2">
              <Label>{tSM("currentQty")}</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px] text-sm">
                {stockLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon("loading")}
                  </span>
                ) : stockData ? (
                  <span>
                    <span className="font-semibold">{stockData.available}</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({stockData.quantity} — {stockData.reserved} = {stockData.available})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="adjust-qty">{tSM("adjustStockNewQty")}</Label>
            <Input id="adjust-qty" type="number" min="0" placeholder="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} disabled={showConfirm} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjust-reason">{tSM("adjustStockReason")}</Label>
            <Input id="adjust-reason" placeholder={tSM("adjustStockReasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)} disabled={showConfirm} />
          </div>

          {showConfirm && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold text-sm">{tSM("confirmAdjustTitle")}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{tSM("adjustStockProductPlaceholder")}:</span>
                <span className="font-medium">#{parseInt(productId, 10)}</span>
                <span className="text-muted-foreground">{tSM("adjustStockWarehouse")}:</span>
                <span className="font-medium">{warehouseName || warehouseId}</span>
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
                <span className="font-medium">{newQty}</span>
                <span className="text-muted-foreground">{tSM("difference")}:</span>
                <span className={`font-medium ${diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : ""}`}>
                  {diff > 0 ? "+" : ""}{diff}
                </span>
              </div>
              {newQtyNum === 0 && (
                <div className="text-accent-electric text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{tSM("writeOffWarning")}</span>
                </div>
              )}
              {stockData && diffPercent > 20 && (
                <div className="text-accent-electric text-sm flex items-center gap-2">
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
              <Button variant="outline" onClick={handleClose}>{tCommon("cancel")}</Button>
              <Button onClick={handleContinue} disabled={!productId || !warehouseId || !newQty || stockLoading}>
                {tSM("continue")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
