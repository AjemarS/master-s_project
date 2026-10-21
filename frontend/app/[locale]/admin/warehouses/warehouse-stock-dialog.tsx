"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Input } from "~/ui/primitives/input";
import { stockApi } from "~/lib/api/admin-api";
import { apiErrorText } from "~/lib/utils/error-handler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import type { Warehouse, Stock } from "~/lib/types";

interface WarehouseStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  stock: Stock[];
  productNames: Map<number, string>;
  /** Called after reorder settings change, to refetch stock */
  onChanged?: () => void;
}

/** Reorder point and batch for one stock line; saved when either field loses focus with a change */
function ReorderCell({ stock, onChanged }: { stock: Stock; onChanged?: () => void }) {
  const t = useTranslations("purchasing");
  const [point, setPoint] = useState(String(stock.reorder_point ?? 0));
  const [batch, setBatch] = useState(String(stock.reorder_quantity ?? 0));

  const save = async () => {
    const data = { reorder_point: Number(point), reorder_quantity: Number(batch) };
    if (!Number.isInteger(data.reorder_point) || !Number.isInteger(data.reorder_quantity) || data.reorder_point < 0 || data.reorder_quantity < 0) return;
    if (data.reorder_point === (stock.reorder_point ?? 0) && data.reorder_quantity === (stock.reorder_quantity ?? 0)) return;
    const res = await stockApi.setReorder(stock.id, data);
    if (res.error) toast.error(apiErrorText(res.error));
    else { toast.success(t("reorderSaved")); onChanged?.(); }
  };

  return (
    <div className="flex items-center gap-1">
      <Input type="number" min={0} value={point} onChange={(e) => setPoint(e.target.value)} onBlur={save}
        className="h-8 w-16" aria-label={t("reorderPointFor", { id: stock.product_id })} />
      <span className="text-muted-foreground">/</span>
      <Input type="number" min={0} value={batch} onChange={(e) => setBatch(e.target.value)} onBlur={save}
        className="h-8 w-16" aria-label={t("reorderQtyFor", { id: stock.product_id })} />
    </div>
  );
}

export function WarehouseStockDialog({ open, onOpenChange, warehouse, stock, productNames, onChanged }: WarehouseStockDialogProps) {
  const t = useTranslations("warehouses");
  const tp = useTranslations("purchasing");
  const tc = useTranslations("common");

  const whStock = warehouse
    // Empty lines with a reorder point are the ones that matter most
    ? stock.filter(s => s.warehouse === warehouse.id && (s.quantity > 0 || (s.reorder_point ?? 0) > 0))
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {warehouse?.name} — {t("stockDetails")}
          </DialogTitle>
          <DialogDescription>{t("stockDetailsDesc")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] -mx-6 px-6">
          <div className="border rounded-lg dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b dark:border-border">
                  <TableHead>{t("productId")}</TableHead>
                  <TableHead>{t("qty")}</TableHead>
                  <TableHead>{t("reserved")}</TableHead>
                  <TableHead>{t("available")}</TableHead>
                  <TableHead title={tp("reorderHint")}>{tp("reorderColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {t("noStock")}
                    </TableCell>
                  </TableRow>
                ) : (
                  whStock.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <span className="font-medium">{productNames.get(s.product_id) || `#${s.product_id}`}</span>
                        <span className="text-xs text-muted-foreground ml-2">#{s.product_id}</span>
                      </TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell className="text-accent-electric">{s.reserved}</TableCell>
                      <TableCell className="text-primary font-semibold">{s.available}</TableCell>
                      <TableCell><ReorderCell stock={s} onChanged={onChanged} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
