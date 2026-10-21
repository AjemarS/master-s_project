"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus, Tag } from "lucide-react";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Checkbox } from "~/ui/primitives/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Switch } from "~/ui/primitives/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/primitives/table";
import { AdminPageHeader, EmptyState, TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useApiGet } from "~/lib/hooks/use-api";
import { promoCodeApi } from "~/lib/api/admin-api";
import { apiErrorText } from "~/lib/utils/error-handler";
import { formatCurrency } from "~/lib/utils/format";
import type { PromoCode } from "~/lib/types";

type Form = {
  code: string; kind: "percent" | "fixed"; value: string; min_order_amount: string;
  starts_at: string; ends_at: string; max_uses: string; once_per_customer: boolean;
};

const EMPTY: Form = { code: "", kind: "percent", value: "", min_order_amount: "0", starts_at: "", ends_at: "", max_uses: "", once_per_customer: false };

/** datetime-local wants local "YYYY-MM-DDTHH:mm"; the API speaks ISO with a zone */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function PromoDialog({ promo, onClose, onSaved }: { promo: PromoCode | "new"; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("promoCodes");
  const tc = useTranslations("common");
  const [form, setForm] = useState<Form>(() =>
    promo === "new" ? EMPTY : {
      code: promo.code, kind: promo.kind, value: promo.value, min_order_amount: promo.min_order_amount,
      starts_at: toLocalInput(promo.starts_at), ends_at: toLocalInput(promo.ends_at),
      max_uses: promo.max_uses === null ? "" : String(promo.max_uses), once_per_customer: promo.once_per_customer,
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      code: form.code, kind: form.kind, value: form.value, min_order_amount: form.min_order_amount || "0",
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      once_per_customer: form.once_per_customer,
    };
    const res = promo === "new" ? await promoCodeApi.create(body) : await promoCodeApi.update(promo.id, body);
    setSaving(false);
    if (res.error) { setError(apiErrorText(res.error)); return; }
    toast.success(t("saved"));
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{promo === "new" ? t("create") : t("edit", { code: promo.code })}</DialogTitle>
            <DialogDescription>{t("dialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pc-code">{t("code")}</Label>
              <Input id="pc-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required maxLength={40} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-kind">{t("kind")}</Label>
              <Select value={form.kind} onValueChange={(v) => set("kind", v as Form["kind"])}>
                <SelectTrigger id="pc-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("kind_percent")}</SelectItem>
                  <SelectItem value="fixed">{t("kind_fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-value">{form.kind === "percent" ? t("valuePercent") : t("valueFixed")}</Label>
              <Input id="pc-value" type="number" step="0.01" min="0.01" max={form.kind === "percent" ? 100 : undefined}
                value={form.value} onChange={(e) => set("value", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-min">{t("minOrder")}</Label>
              <Input id="pc-min" type="number" step="0.01" min="0" value={form.min_order_amount} onChange={(e) => set("min_order_amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-max">{t("maxUses")}</Label>
              <Input id="pc-max" type="number" min="1" placeholder={t("unlimited")} value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-start">{t("startsAt")}</Label>
              <Input id="pc-start" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-end">{t("endsAt")}</Label>
              <Input id="pc-end" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox id="pc-once" checked={form.once_per_customer} onCheckedChange={(v) => set("once_per_customer", v === true)} />
              <Label htmlFor="pc-once" className="font-normal">{t("oncePerCustomer")}</Label>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={saving}>{tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PromoCodesClient() {
  const t = useTranslations("promoCodes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useApiGet("/promo-codes", () => promoCodeApi.list());
  const codes = data?.results ?? [];
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);

  const toggleActive = async (p: PromoCode) => {
    const res = await promoCodeApi.update(p.id, { is_active: !p.is_active });
    if (res.error) toast.error(apiErrorText(res.error));
    else mutate();
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "uk-UA", { day: "numeric", month: "short", year: "numeric" }) : "";
  const isExpired = (p: PromoCode) => !!p.ends_at && new Date(p.ends_at) < new Date();

  return (
    <div className="min-h-dvh bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")} subtitle={t("subtitle")} icon={Tag} backLabel={tc("back")}
          actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden />{t("create")}</Button>}
        />
        <ErrorAlert message={error?.message ?? null} />
        {isLoading && !data ? <TableSkeleton rows={5} cols={6} /> : (
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="border rounded-lg dark:border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t("code")}</TableHead>
                      <TableHead>{t("discount")}</TableHead>
                      <TableHead>{t("conditions")}</TableHead>
                      <TableHead>{t("period")}</TableHead>
                      <TableHead className="text-right">{t("used")}</TableHead>
                      <TableHead>{t("active")}</TableHead>
                      <TableHead><span className="sr-only">{t("actions")}</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? <EmptyState icon={Tag} message={t("empty")} colSpan={7} /> : codes.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium">{p.code}</TableCell>
                        <TableCell>{p.kind === "percent" ? `${Number(p.value)}%` : formatCurrency(Number(p.value))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {Number(p.min_order_amount) > 0 && <div>{t("fromAmount", { amount: formatCurrency(Number(p.min_order_amount)) })}</div>}
                          {p.once_per_customer && <div>{t("oncePerCustomerShort")}</div>}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {p.starts_at || p.ends_at ? `${fmt(p.starts_at) || "…"} — ${fmt(p.ends_at) || "…"}` : t("always")}
                          {isExpired(p) && <Badge variant="outline" className="ml-2 text-xs">{t("expired")}</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.used_count}{p.max_uses !== null && ` / ${p.max_uses}`}</TableCell>
                        <TableCell>
                          <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} aria-label={t("toggleNamed", { code: p.code })} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={t("edit", { code: p.code })}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        {editing && (
          <PromoDialog
            key={editing === "new" ? "new" : editing.id}
            promo={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); mutate(); }}
          />
        )}
      </div>
    </div>
  );
}
