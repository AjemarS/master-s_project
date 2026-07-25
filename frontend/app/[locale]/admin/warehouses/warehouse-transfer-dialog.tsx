"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { warehouseService } from "./actions";
import type { Warehouse, Product } from "~/lib/types";

interface WarehouseTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  onSuccess: () => void;
}

export function WarehouseTransferDialog({ open, onOpenChange, warehouses, onSuccess }: WarehouseTransferDialogProps) {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [stockedWarehouseIds, setStockedWarehouseIds] = useState<Set<number> | null>(null);
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const stockedLoading = !!productId && stockedWarehouseIds === null;

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
          const res = await warehouseService.getProductById(id);
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
        const res = await warehouseService.searchProducts(productSearch);
        if (cancelled) return;
        if (!res.error && res.data?.results) {
          const results = res.data.results;
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

  // When product selected, find which warehouses stock it
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    startTransition(() => setStockedWarehouseIds(null));
    warehouseService.getStock({ product_id: parseInt(productId) })
      .then(res => {
        if (cancelled) return;
        const ids = new Set(res.data?.map(s => s.warehouse) ?? []);
        startTransition(() => {
          setStockedWarehouseIds(ids);
          if (fromWarehouseId && !ids.has(parseInt(fromWarehouseId))) {
            setFromWarehouseId("");
          }
        });
      })
      .catch(() => { if (!cancelled) startTransition(() => setStockedWarehouseIds(new Set())); });
    return () => { cancelled = true; };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When both product and from-warehouse selected, prefill quantity
  useEffect(() => {
    if (!productId || !fromWarehouseId) return;
    let cancelled = false;
    warehouseService.getStock({
      product_id: parseInt(productId),
      warehouse_id: parseInt(fromWarehouseId),
    }).then(res => {
      if (cancelled) return;
      const stockRecord = res.data?.[0];
      if (stockRecord) {
        setQuantity(String(stockRecord.quantity));
        setAvailableQuantity(stockRecord.quantity);
      } else {
        setQuantity("1");
        setAvailableQuantity(null);
      }
    });
    return () => { cancelled = true; };
  }, [productId, fromWarehouseId]);

  const handleTransfer = async () => {
    const pid = parseInt(productId, 10);
    const from = parseInt(fromWarehouseId, 10);
    const to = parseInt(toWarehouseId, 10);
    const qty = parseInt(quantity, 10);

    if (isNaN(pid) || isNaN(from) || isNaN(to) || isNaN(qty) || qty <= 0 || from === to) {
      toast.error(tc("error"), { description: tc("noData") });
      return;
    }

    setSaving(true);
    try {
      const res = await warehouseService.transfer({
        product_id: pid,
        from_warehouse_id: from,
        to_warehouse_id: to,
        quantity: qty,
        notes: notes || undefined,
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(t("transferStock"), { description: `#${pid} — ${qty} ${t("qty")}` });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    } finally {
      setSaving(false);
    }
  };

  const showDropdown = productSearch.length >= 2 && productResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transferDialogTitle")}</DialogTitle>
          <DialogDescription>{t("transferDialogDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-transfer-product" className="text-right">{t("productId")} *</Label>
            <div className="col-span-3 relative">
              <Input
                id="wh-transfer-product"
                placeholder={tc("searchProducts")}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {showDropdown && (
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-transfer-from" className="text-right">{t("fromWarehouse")} *</Label>
            <div className="col-span-3">
              <div className="relative">
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger id="wh-transfer-from">
                    <SelectValue placeholder={stockedLoading ? "Loading…" : t("fromWarehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => !stockedWarehouseIds || stockedWarehouseIds.size === 0 || stockedWarehouseIds.has(w.id))
                      .map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {stockedLoading && (
                  <Loader2 className="absolute right-8 top-2.5 h-4 w-4 animate-spin" />
                )}
              </div>
              {productId && stockedWarehouseIds && stockedWarehouseIds.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stockedWarehouseIds.size} warehouse{stockedWarehouseIds.size !== 1 ? "s" : ""} have this product in stock
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-transfer-to" className="text-right">{t("toWarehouse")} *</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
              <SelectTrigger id="wh-transfer-to" className="col-span-3"><SelectValue placeholder={t("toWarehouse")} /></SelectTrigger>
              <SelectContent>
                {warehouses
                  .filter((w) => String(w.id) !== fromWarehouseId)
                  .map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-transfer-qty" className="text-right">{t("qty")} *</Label>
            <Input
              id="wh-transfer-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="col-span-3"
            />
            {availableQuantity !== null && (
              <p className="text-xs text-muted-foreground col-span-4 text-right">
                {t("available")}: {availableQuantity}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-transfer-notes" className="text-right">{t("notes")}</Label>
            <Input
              id="wh-transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder={t("notes")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{tc("cancel")}</Button>
          <Button
            onClick={handleTransfer}
            disabled={saving || !productId || !fromWarehouseId || !toWarehouseId}
          >
            {saving ? t("transferring") : t("transferStock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
