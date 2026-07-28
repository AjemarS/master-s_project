"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/ui/primitives/dialog";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import type { StockMovement } from "~/lib/types";

interface StockMovementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: StockMovement | null;
  movementTypes: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  formatDate: (dateStr: string) => string;
}

export function StockMovementDetailDialog({
  open, onOpenChange, movement, movementTypes, formatDate,
}: StockMovementDetailDialogProps) {
  const tSM = useTranslations("stockMovements");
  const tc = useTranslations("common");

  if (!movement) return null;

  const typeInfo = movementTypes[movement.type] || { label: movement.type, variant: "outline" as const };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tSM("detailDialogTitle", { id: movement.id })}</DialogTitle>
          <DialogDescription>{tSM("detailDialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{tSM("id")}:</span>
              <p className="font-medium">#{movement.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("type")}:</span>
              <div className="mt-0.5">
                <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("productId")}:</span>
              <p className="font-medium font-mono">#{movement.product_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("quantity")}:</span>
              <p className="font-medium">{movement.quantity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("from")}:</span>
              <p className="font-medium">{movement.from_warehouse_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("to")}:</span>
              <p className="font-medium">{movement.to_warehouse_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("reference")}:</span>
              <p className="font-medium">
                {movement.reference_type
                  ? `${movement.reference_type}${movement.reference_id ? ` #${movement.reference_id}` : ""}`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{tSM("user")}:</span>
              <p className="font-medium">{movement.created_by || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">{tSM("date")}:</span>
              <p className="font-medium">{formatDate(movement.created_at)}</p>
            </div>
          </div>

          {movement.notes && (
            <div className="text-sm border rounded-lg p-3 bg-muted/30">
              <span className="text-muted-foreground">{tc("notes")}:</span>
              <p className="mt-0.5 whitespace-pre-wrap">{movement.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
