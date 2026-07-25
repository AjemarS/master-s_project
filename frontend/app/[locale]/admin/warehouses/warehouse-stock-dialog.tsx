"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
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
}

export function WarehouseStockDialog({ open, onOpenChange, warehouse, stock, productNames }: WarehouseStockDialogProps) {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  const whStock = warehouse
    ? stock.filter(s => s.warehouse === warehouse.id && s.quantity > 0)
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {whStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
