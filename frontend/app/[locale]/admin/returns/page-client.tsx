"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorText } from "~/lib/utils/error-handler";
import { RotateCcw } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Checkbox } from "~/ui/primitives/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "~/ui/primitives/dialog";
import { Label } from "~/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "~/ui/primitives/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/primitives/table";
import { Textarea } from "~/ui/primitives/textarea";
import { AdminPageHeader, EmptyState, TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { ReturnStatusBadge } from "~/ui/components/return-status-badge";
import { useApiGet } from "~/lib/hooks/use-api";
import { returnsApi } from "~/lib/api/admin-api";
import { formatCurrency } from "~/lib/utils/format";
import type { ReturnRequest, ReturnResolution, ReturnStatus } from "~/lib/types";

const FILTERS: (ReturnStatus | "all")[] = ["submitted", "approved", "received", "resolved", "rejected", "all"];

// Same table as ReturnRequest.STATUS_TRANSITIONS in order-service
const NEXT: Record<ReturnStatus, ReturnStatus[]> = {
  submitted: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

type Pending = { claim: ReturnRequest; to: ReturnStatus };

export function ReturnsClient() {
  const t = useTranslations("returns");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [filter, setFilter] = useState<ReturnStatus | "all">("submitted");
  const { data, error, isLoading, mutate } = useApiGet(`/returns?status=${filter}`, () =>
    returnsApi.list(filter === "all" ? undefined : { status: filter })
  );
  const claims = data?.results ?? [];

  const [pending, setPending] = useState<Pending | null>(null);
  const [comment, setComment] = useState("");
  const [restock, setRestock] = useState(true);
  const [resolution, setResolution] = useState<ReturnResolution | "">("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const open = (claim: ReturnRequest, to: ReturnStatus) => {
    setPending({ claim, to });
    setComment("");
    setRestock(claim.kind === "return");
    setResolution(claim.kind === "return" ? "refund" : "repair");
    setActionError(null);
  };

  const resolutions: ReturnResolution[] =
    pending?.claim.kind === "warranty" ? ["repair", "replace", "refund"] : ["refund", "replace"];
  const needsComment = pending?.to === "rejected";
  const canSubmit = !!pending && (!needsComment || comment.trim().length > 0) && (pending.to !== "resolved" || !!resolution);

  const submit = async () => {
    if (!pending || !canSubmit) return;
    setSaving(true);
    const res = await returnsApi.setStatus(pending.claim.id, {
      status: pending.to,
      comment: comment.trim() || undefined,
      ...(pending.to === "received" ? { restock } : {}),
      ...(pending.to === "resolved" && resolution ? { resolution } : {}),
    });
    setSaving(false);
    if (res.error) {
      setActionError(apiErrorText(res.error));
      return;
    }
    toast.success(t("updated"));
    setPending(null);
    mutate();
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "uk-UA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-dvh bg-muted/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader title={t("adminTitle")} subtitle={t("adminSubtitle")} icon={RotateCcw} backLabel={tc("back")} />

        <div className="flex flex-wrap gap-1 mb-4" role="group" aria-label={t("filterByStatus")}>
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={f === filter ? "secondary" : "ghost"} aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {f === "all" ? t("all") : t(`status_${f}`)}
            </Button>
          ))}
        </div>

        <ErrorAlert message={error?.message ?? null} />

        {isLoading && !data ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="border rounded-lg dark:border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b dark:border-border">
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("order")}</TableHead>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead>{t("kind")}</TableHead>
                      <TableHead>{t("reason")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.length === 0 ? (
                      <EmptyState icon={RotateCcw} message={t("empty")} colSpan={7} />
                    ) : (
                      claims.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                          <TableCell className="font-mono text-xs">{c.order_number}</TableCell>
                          <TableCell>
                            <div className="font-medium">{c.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              × {c.quantity} · {formatCurrency(Number(c.unit_price) * c.quantity)}
                            </div>
                          </TableCell>
                          <TableCell>{t(`kind_${c.kind}`)}</TableCell>
                          <TableCell className="max-w-xs">
                            <p className="line-clamp-2 text-sm" title={c.reason}>{c.reason}</p>
                            {c.admin_comment && <p className="text-xs text-muted-foreground line-clamp-1" title={c.admin_comment}>↳ {c.admin_comment}</p>}
                          </TableCell>
                          <TableCell>
                            <ReturnStatusBadge status={c.status} />
                            {c.resolution && <div className="text-xs text-muted-foreground mt-1">{t(`resolution_${c.resolution}`)}</div>}
                            {c.restocked && <div className="text-xs text-muted-foreground">{t("restocked")}</div>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 flex-wrap">
                              {NEXT[c.status].map((to) => (
                                <Button key={to} size="sm" variant={to === "rejected" ? "ghost" : "outline"} onClick={() => open(c, to)}>
                                  {t(`action_${to}`)}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{pending && t(`action_${pending.to}`)}</DialogTitle>
                <DialogDescription>
                  {pending && `${t(`kind_${pending.claim.kind}`)} · ${pending.claim.product_name} × ${pending.claim.quantity} · ${pending.claim.order_number}`}
                </DialogDescription>
              </DialogHeader>

              {pending?.to === "received" && (
                <div className="flex items-start gap-2">
                  <Checkbox id="restock" checked={restock} onCheckedChange={(v) => setRestock(v === true)} className="mt-0.5" />
                  <Label htmlFor="restock" className="font-normal leading-snug">
                    {t("restockLabel")}
                    <span className="block text-xs text-muted-foreground">{t("restockHint")}</span>
                  </Label>
                </div>
              )}

              {pending?.to === "resolved" && (
                <fieldset>
                  <legend className="text-sm font-medium mb-2">{t("resolution")}</legend>
                  <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ReturnResolution)}>
                    {resolutions.map((r) => (
                      <div key={r} className="flex items-start gap-2">
                        <RadioGroupItem value={r} id={`res-${r}`} className="mt-0.5" />
                        <Label htmlFor={`res-${r}`} className="font-normal leading-snug">
                          {t(`resolution_${r}`)}
                          <span className="block text-xs text-muted-foreground">
                            {r === "refund"
                              ? t("refundHint", { amount: formatCurrency(Number(pending.claim.unit_price) * pending.claim.quantity) })
                              : t(`resolutionHint_${r}`)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin-comment">
                  {needsComment ? t("commentRequired") : t("commentOptional")}
                </Label>
                <Textarea id="admin-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} required={needsComment} />
              </div>

              {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPending(null)}>{tc("cancel")}</Button>
                <Button type="submit" variant={pending?.to === "rejected" ? "destructive" : "default"} disabled={!canSubmit || saving}>
                  {saving ? t("sending") : t("confirm")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
