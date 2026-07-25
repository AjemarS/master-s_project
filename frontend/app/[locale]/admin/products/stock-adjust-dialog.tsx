"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { productService } from "./actions";
import type { Product } from "~/lib/types";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export function StockAdjustDialog({ open, onOpenChange, product, onSuccess }: StockAdjustDialogProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const [stockDelta, setStockDelta] = useState("");
  const [stockConfirmStep, setStockConfirmStep] = useState(false);
  const [stockAdjusting, setStockAdjusting] = useState(false);

  // Guard: no product means nothing to adjust
  if (!product) return null;

  const delta = parseInt(stockDelta, 10);
  const isValidDelta = !isNaN(delta) && delta !== 0;

  const handleClose = () => {
    setStockDelta("");
    setStockConfirmStep(false);
    setStockAdjusting(false);
    onOpenChange(false);
  };

  const handleContinue = () => {
    if (!isValidDelta) {
      toast.error("Enter a valid quantity change");
      return;
    }
    setStockConfirmStep(true);
  };

  const handleExecute = async () => {
    if (!product || !isValidDelta) return;
    setStockAdjusting(true);
    try {
      await productService.updateStock(product.id, delta);
      toast.success("Stock updated", {
        description: `${product.name}: ${product.stock} → ${product.stock + delta}`,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      toast.error("Failed to update stock", {
        description: err instanceof Error ? err.message : "Error",
      });
    } finally {
      setStockAdjusting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {stockConfirmStep
              ? t("confirmTitle", { name: product.name })
              : `${t("stock")} — ${product.name}`}
          </DialogTitle>
          <DialogDescription>
            {stockConfirmStep
              ? t("confirmDesc")
              : `${t("stock")}: ${t("units", { count: product.stock })}`}
          </DialogDescription>
        </DialogHeader>

        {stockConfirmStep ? (
          <div className="py-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("currentStock")}</span>
                <span className="font-medium">{product.stock}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("adjustment")}</span>
                <span className={`font-medium ${delta > 0 ? "text-primary" : "text-destructive"}`}>
                  {delta > 0 ? "+" : ""}{stockDelta}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>{t("newStock")}</span>
                <span>{product.stock + delta}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("confirmPrompt")}</p>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <Label htmlFor="stock-delta">{t("stock")}</Label>
            <Input
              id="stock-delta"
              onChange={(e) => setStockDelta(e.target.value)}
              placeholder={t("stockPlaceholder")}
              type="number"
              value={stockDelta}
            />
            <p className="text-xs text-muted-foreground">
              {t("stockHint")}
            </p>
          </div>
        )}

        <DialogFooter>
          {stockConfirmStep ? (
            <>
              <Button variant="outline" onClick={() => setStockConfirmStep(false)} type="button">
                {t("back")}
              </Button>
              <Button onClick={handleExecute} disabled={stockAdjusting} type="button">
                {stockAdjusting ? tc("loading") : tc("confirm")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} type="button">
                {tc("cancel")}
              </Button>
              <Button onClick={handleContinue} disabled={!isValidDelta} type="button">
                {t("continue")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
