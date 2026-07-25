"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import type { ReceiptItem } from "./actions";

interface POSSaleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptItem[];
  total: number;
  submitting: boolean;
  onConfirm: () => void;
}

export function POSSaleConfirmDialog({
  open,
  onOpenChange,
  receipt,
  total,
  submitting,
  onConfirm,
}: POSSaleConfirmDialogProps) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("confirmSaleTitle")}</DialogTitle>
          <DialogDescription>{t("confirmSaleDesc")}</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-60 overflow-y-auto space-y-2">
          {receipt.map((item) => (
            <div key={item.product_id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <div className="flex-1 min-w-0 mr-2">
                <span className="font-medium truncate block">{item.name}</span>
                <span className="text-muted-foreground">
                  {item.quantity} &times; {formatCurrency(item.price)}
                </span>
              </div>
              <span className="font-semibold whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-base font-bold">
          <span>{t("total")}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {submitting ? tc("loading") : t("confirmSale")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
