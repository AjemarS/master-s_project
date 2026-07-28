"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Package, PackageOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "~/ui/primitives/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";
import { Separator } from "~/ui/primitives/separator";
import { Button } from "~/ui/primitives/button";
import { formatCurrency } from "~/lib/utils/format";
import type { GoodsReceiptNote } from "~/lib/types";

interface GoodsReceiptDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: GoodsReceiptNote | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function GoodsReceiptDetailDialog({
  open, onOpenChange, receipt,
}: GoodsReceiptDetailDialogProps) {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-muted-foreground" />
            {t("detailDialogTitle", { id: receipt.id })}
          </DialogTitle>
          <DialogDescription>
            {t("detailDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid gap-4 py-4"
        >
          {/* Header info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t("supplier")}:</span>
              <p className="font-medium">{receipt.supplier_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("warehouse")}:</span>
              <p className="font-medium">{receipt.warehouse_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("date")}:</span>
              <p className="font-medium">{formatDate(receipt.receipt_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("refNumber")}:</span>
              <p className="font-medium">{receipt.reference_number || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("createdBy")}:</span>
              <p className="font-medium">{receipt.created_by || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("amount")}:</span>
              <p className="font-semibold text-base">{formatCurrency(receipt.total_amount)}</p>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">{tc("notes")}:</span>
              <p className="mt-0.5">{receipt.notes}</p>
            </div>
          )}

          <Separator />

          {/* Items table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t("productId")}</TableHead>
                  <TableHead className="text-right">{t("qty")}</TableHead>
                  <TableHead className="text-right">{t("costPrice")}</TableHead>
                  <TableHead className="text-right">{t("total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      <Package className="h-4 w-4 inline-block opacity-50 mr-2" />
                      {t("noItems")}
                    </TableCell>
                  </TableRow>
                ) : (
                  receipt.items.map((item) => {
                    const lineTotal = Number(item.quantity) * Number(item.cost_price);
                    return (
                      <TableRow key={item.id ?? item.product_id}>
                        <TableCell className="font-mono">#{item.product_id}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.cost_price))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
