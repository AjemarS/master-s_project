"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Textarea } from "~/ui/primitives/textarea";
import { X } from "lucide-react";
import { useState } from "react";
import { goodsReceiptService } from "./actions";
import type { GoodsReceiptNote, Supplier, Warehouse } from "~/lib/types";

interface GrnFormItem {
  _key: number;
  product_id: string;
  quantity: string;
  cost_price: string;
}

let itemKeyCounter = 0;

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  receipt: GoodsReceiptNote | null;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}

function emptyItem(): GrnFormItem {
  return { _key: ++itemKeyCounter, product_id: "", quantity: "1", cost_price: "0" };
}

function initItems(receipt: GoodsReceiptNote | null, mode: "create" | "edit"): GrnFormItem[] {
  if (mode === "create") return [emptyItem()];
  const mapped = (receipt?.items || []).map((item) => ({
    _key: ++itemKeyCounter,
    product_id: String(item.product_id),
    quantity: String(item.quantity),
    cost_price: String(item.cost_price),
  }));
  if (mapped.length === 0 || mapped[mapped.length - 1].product_id.trim() !== "") {
    mapped.push(emptyItem());
  }
  return mapped;
}

export function GoodsReceiptDialog({
  open, onOpenChange, mode, receipt, suppliers, warehouses, onSuccess,
}: GoodsReceiptDialogProps) {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [supplier, setSupplier] = useState(
    mode === "edit" && receipt ? String(receipt.supplier) : ""
  );
  const [warehouse, setWarehouse] = useState(
    mode === "edit" && receipt ? String(receipt.warehouse) : ""
  );
  const [date, setDate] = useState(
    mode === "edit" && receipt
      ? (receipt.receipt_date.split("T")[0] || receipt.receipt_date)
      : today
  );
  const [ref, setRef] = useState(
    mode === "edit" && receipt ? (receipt.reference_number || "") : ""
  );
  const [notes, setNotes] = useState(
    mode === "edit" && receipt ? (receipt.notes || "") : ""
  );
  const [items, setItems] = useState<GrnFormItem[]>(() => initItems(receipt, mode));

  const resetAndClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const removeItem = useCallback((i: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== i);
    });
  }, []);

  const updateItem = useCallback((i: number, field: keyof GrnFormItem, value: string) => {
    setItems((prev) => {
      const next = prev.map((item, j) => (j === i ? { ...item, [field]: value } : item));
      if (i === next.length - 1 && field === "product_id" && value.trim() !== "") {
        next.push(emptyItem());
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!supplier || !warehouse) return;

    const filteredItems = items
      .filter((item) => item.product_id.trim() !== "")
      .map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10) || 1,
        cost_price: parseFloat(item.cost_price) || 0,
      }));

    if (filteredItems.length === 0) return;

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await goodsReceiptService.create({
          supplier: parseInt(supplier, 10),
          warehouse: parseInt(warehouse, 10),
          receipt_date: date,
          reference_number: ref,
          notes,
          items: filteredItems,
        });
        if (res.error) throw new Error(res.error.message);
        toast.success(t("createGrn"));
      } else if (receipt) {
        const res = await goodsReceiptService.update(receipt.id, {
          supplier: parseInt(supplier, 10),
          warehouse: parseInt(warehouse, 10),
          receipt_date: date,
          reference_number: ref,
          notes,
          items: filteredItems,
        });
        if (res.error) throw new Error(res.error.message);
        toast.success(t("grnUpdated"));
      }
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createDialogTitle") : t("editDialogTitle")}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("createDialogDesc") : t("editDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Supplier */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right pr-2">{t("supplier")} *</Label>
            <div className="col-span-3">
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
          </div>

          {/* Warehouse */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right pr-2">{t("warehouse")} *</Label>
            <div className="col-span-3">
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
          </div>

          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right pr-2">{t("date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Reference */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right pr-2">{t("refNumber")}</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={t("refPlaceholder")}
              className="col-span-3"
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2 pr-2">{tc("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Items */}
          <div className="col-span-4 border-t pt-4">
            <Label className="font-semibold mb-2 block">{t("positions")}</Label>
            {items.map((item, i) => {
              const isLastRow = i === items.length - 1;
              const isEmpty = item.product_id.trim() === "";
              return (
                <div
                  key={item._key}
                  className={`flex gap-2 mb-2 items-start ${isLastRow && isEmpty ? "opacity-50" : ""}`}
                >
                  <div className="flex-1">
                    <Label className="text-xs">{t("productId")}</Label>
                    <Input
                      value={item.product_id}
                      onChange={(e) => updateItem(i, "product_id", e.target.value)}
                      placeholder={t("productId")}
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">{t("qty")}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">{t("costPrice")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.cost_price}
                      onChange={(e) => updateItem(i, "cost_price", e.target.value)}
                    />
                  </div>
                  {!isLastRow && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(i)}
                      className="mt-5 shrink-0"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
            {saving ? tc("saving") : mode === "create" ? tc("create") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
