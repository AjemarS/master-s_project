"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorText } from "~/lib/utils/error-handler";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Textarea } from "~/ui/primitives/textarea";
import { RadioGroup, RadioGroupItem } from "~/ui/primitives/radio-group";
import { returnsApi } from "~/lib/api/admin-api";
import type { OrderItem, ReturnKind } from "~/lib/types";

interface ReturnDialogProps {
  item: OrderItem | null;
  /** Kinds still open for this item, decided by the page from the delivery date */
  kinds: ReturnKind[];
  /** Units not covered by other claims */
  maxQuantity: number;
  onClose: () => void;
  onCreated: () => void;
}

export function ReturnDialog({ item, kinds, maxQuantity, onClose, onCreated }: ReturnDialogProps) {
  const t = useTranslations("returns");
  const [kind, setKind] = useState<ReturnKind | "">("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chosenKind = kind || kinds[0];
  const valid = !!chosenKind && reason.trim().length >= 10 && quantity >= 1 && quantity <= maxQuantity;

  const reset = () => {
    setKind("");
    setQuantity(1);
    setReason("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !valid) return;
    setSaving(true);
    setError(null);
    const res = await returnsApi.create({ item_id: item.id, kind: chosenKind, quantity, reason: reason.trim() });
    setSaving(false);
    if (res.error) {
      setError(apiErrorText(res.error));
      return;
    }
    toast.success(t("created"));
    reset();
    onCreated();
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{item?.product_name}</DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">{t("kind")}</legend>
            <RadioGroup value={chosenKind} onValueChange={(v) => setKind(v as ReturnKind)}>
              {kinds.map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <RadioGroupItem value={k} id={`kind-${k}`} className="mt-0.5" />
                  <Label htmlFor={`kind-${k}`} className="font-normal leading-snug">
                    <span className="font-medium">{t(`kind_${k}`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`kindHint_${k}`)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          {maxQuantity > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="return-qty">{t("quantity")}</Label>
              <Input
                id="return-qty"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="return-reason">{t("reason")}</Label>
            <Textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(chosenKind === "warranty" ? "reasonPlaceholderWarranty" : "reasonPlaceholderReturn")}
              rows={4}
              maxLength={2000}
              aria-describedby="return-reason-hint"
              required
            />
            <p id="return-reason-hint" className="text-xs text-muted-foreground">{t("reasonHint")}</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? t("sending") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
