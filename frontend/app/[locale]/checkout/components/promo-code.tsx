"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Tag, X } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { orderApi } from "~/lib/api/admin-api";
import { apiErrorText } from "~/lib/utils/error-handler";

export interface AppliedPromo {
  code: string;
  discount: number;
}

interface PromoCodeProps {
  subtotal: number;
  applied: AppliedPromo | null;
  onChange: (promo: AppliedPromo | null) => void;
}

/** A preview only: the order recomputes the discount from catalog prices when it is placed */
export function PromoCode({ subtotal, applied, onChange }: PromoCodeProps) {
  const t = useTranslations("checkout");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async (value: string) => {
    setChecking(true);
    const res = await orderApi.checkPromo(value, subtotal);
    setChecking(false);
    if (res.error || !res.data) {
      setError(res.error ? apiErrorText(res.error) : t("promoInvalid"));
      onChange(null);
      return;
    }
    setError(null);
    onChange({ code: res.data.code, discount: Number(res.data.discount) });
  };

  // The cart changed: a percentage or a minimum amount may no longer give the same discount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-ask the server only when the cart total changes
    if (applied) check(applied.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-medium">{applied.code}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(null); setCode(""); }} aria-label={t("promoRemove")}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) check(code.trim()); }}
    >
      <Label htmlFor="promo-code" className="text-sm">{t("promoLabel")}</Label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          autoComplete="off"
          maxLength={40}
          aria-invalid={!!error}
          aria-describedby={error ? "promo-error" : undefined}
        />
        <Button type="submit" variant="outline" disabled={!code.trim() || checking}>{t("promoApply")}</Button>
      </div>
      {error && <p id="promo-error" role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
