"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Calendar, FileText, Hash, Loader2, Package, Plus, Truck, Warehouse as WarehouseIcon, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Textarea } from "~/ui/primitives/textarea";
import { Separator } from "~/ui/primitives/separator";
import { goodsReceiptService } from "./actions";
import type { Supplier, Warehouse } from "~/lib/types";
import { useActivityFeed } from "../components/activity-feed";

interface GrnFormItem {
  _key: number;
  product_id: string;
  quantity: string;
  cost_price: string;
}

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}

export function GoodsReceiptDialog({
  open, onOpenChange, suppliers, warehouses, onSuccess,
}: GoodsReceiptDialogProps) {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  const refCounterRef = useRef(0);
  const itemKeyCounterRef = useRef(1);
  const fetchedKeysRef = useRef<Set<string>>(new Set());

  function emptyItem(): GrnFormItem {
    return { _key: ++itemKeyCounterRef.current, product_id: "", quantity: "1", cost_price: "" };
  }

  const [saving, setSaving] = useState(false);
  const { pushEvent } = useActivityFeed();

  const today = new Date().toISOString().split("T")[0];
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [date, setDate] = useState(today);
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<GrnFormItem[]>(() => [{ _key: 1, product_id: "", quantity: "1", cost_price: "" }]);

  const activeItemCount = items.filter((item) => item.product_id.trim() !== "").length;

  const resetAndClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const removeItem = useCallback((i: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== i);
    });
  }, []);

  const updateItem = useCallback((i: number, field: Exclude<keyof GrnFormItem, "_key">, value: string) => {
    setItems((prev) => {
      const next = prev.map((item, j) => (j === i ? { ...item, [field]: value } : item));
      if (i === next.length - 1 && field === "product_id" && value.trim() !== "") {
        next.push(emptyItem());
      }
      return next;
    });
  }, []);

  // Auto-fetch product info: last cost_price and current stock
  const [productInfoCache, setProductInfoCache] = useState<Record<string, { last_cost_price: string | null; current_stock: number }>>({});

  useEffect(() => {
    const lastItem = items[items.length - 2];
    if (!lastItem || !lastItem.product_id.trim() || !warehouse) return;

    const pid = lastItem.product_id.trim();
    const cacheKey = `${pid}_${warehouse}`;
    if (fetchedKeysRef.current.has(cacheKey)) return;
    fetchedKeysRef.current.add(cacheKey);

    let cancelled = false;
    goodsReceiptService.productInfo(parseInt(pid, 10), parseInt(warehouse, 10)).then((res) => {
      if (cancelled) return;
      if (res.error) return;
      const info = res.data;
      if (!info) return;

      setProductInfoCache((prev) => ({ ...prev, [cacheKey]: info }));
      setItems((prev) => {
        return prev.map((item, j) => {
          if (j === prev.length - 2 && item.product_id === pid && item.cost_price === "") {
            return { ...item, cost_price: info.last_cost_price ?? "" };
          }
          return item;
        });
      });
    });
    return () => { cancelled = true; };
  }, [items, warehouse]);

  // Auto-generate reference number on dialog open
  useEffect(() => {
    if (open) {
      refCounterRef.current += 1;
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      setRef(`GRN-${today}-${String(refCounterRef.current).padStart(3, "0")}`);
    }
  }, [open]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) resetAndClose();
  }, [resetAndClose]);

  const handleSave = async () => {
    const supplierId = parseInt(supplier, 10);
    const warehouseId = parseInt(warehouse, 10);
    if (!supplier || !warehouse || isNaN(supplierId) || isNaN(warehouseId)) {
      toast.error(tc("error"), { description: "Invalid supplier or warehouse selection." });
      return;
    }

    const filteredItems = items
      .filter((item) => item.product_id.trim() !== "")
      .map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10) || 1,
        cost_price: parseFloat(item.cost_price) || 0,
      }));

    if (filteredItems.length === 0) return;

    for (const item of filteredItems) {
      if (isNaN(item.product_id) || item.product_id <= 0) {
        toast.error(tc("error"), { description: "Invalid Product ID in one of the items." });
        return;
      }
      if (isNaN(item.quantity) || item.quantity <= 0) {
        toast.error(tc("error"), { description: "Quantity must be greater than 0." });
        return;
      }
      if (isNaN(item.cost_price) || item.cost_price < 0) {
        toast.error(tc("error"), { description: "Cost price must be a valid number." });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await goodsReceiptService.create({
        supplier: supplierId,
        warehouse: warehouseId,
        receipt_date: date,
        reference_number: ref,
        notes,
        items: filteredItems,
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(t("createGrn"));
      pushEvent({ type: "create", message: `Created goods receipt (supplier #${supplier})`, entityType: "goods_receipt" });
      resetAndClose();
      onSuccess();
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : tc("error"),
      });
    } finally {
      setSaving(false);
    }
  };

  const getProductInfo = (productId: string): { last_cost_price: string | null; current_stock: number } | null => {
    if (!productId.trim() || !warehouse) return null;
    const cacheKey = `${productId.trim()}_${warehouse}`;
    return productInfoCache[cacheKey] || null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            {t("createDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("createDialogDesc")}</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2"
        >
          {/* Header card */}
          <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Supplier */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {t("supplier")} *
                </Label>
                <Select value={supplier} onValueChange={setSupplier}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectSupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Warehouse */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <WarehouseIcon className="h-3.5 w-3.5" />
                  {t("warehouse")} *
                </Label>
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectWarehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("date")}
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  {t("refNumber")}
                </Label>
                <Input
                  value={ref}
                  disabled
                  placeholder={t("refPlaceholder")}
                  className="h-9"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {tc("notes")}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Items heading */}
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Package className="h-4 w-4" />
            {t("positions")}
            <span className="text-xs text-muted-foreground font-normal">
              ({activeItemCount})
            </span>
          </div>

          {/* Items list */}
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const isLastRow = i === items.length - 1;
              const isEmpty = item.product_id.trim() === "";
              const prodInfo = isLastRow ? null : getProductInfo(item.product_id);

              return (
                <motion.div
                  key={item._key}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-lg p-3 bg-card space-y-2 ${isLastRow && isEmpty ? "border-dashed opacity-60" : ""}`}
                >
                  <div className="grid grid-cols-[1fr_80px_120px_32px] gap-3 items-start">
                    {/* Product ID */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("productId")}</Label>
                      <Input
                        value={item.product_id}
                        onChange={(e) => updateItem(i, "product_id", e.target.value)}
                        placeholder={t("productId")}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("qty")}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Cost Price */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("costPrice")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost_price}
                        onChange={(e) => updateItem(i, "cost_price", e.target.value)}
                        placeholder={prodInfo?.last_cost_price ? String(prodInfo.last_cost_price) : ""}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Remove button */}
                    {!isLastRow ? (
                      <div className="flex items-end pb-[2px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(i)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  {/* Stock info badge */}
                  {prodInfo && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("currentStock")}: {prodInfo.current_stock}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add item button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="gap-1.5 text-muted-foreground self-start"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addItem")}
          </Button>
        </motion.div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={saving}
            type="button"
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !supplier || !warehouse}
            type="button"
          >
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {saving ? tc("saving") : tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
