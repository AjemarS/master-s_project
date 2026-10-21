"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, Star } from "lucide-react";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/cn";
import { useApiGet } from "~/lib/hooks/use-api";
import { useCurrentUser } from "~/lib/auth-client";
import { reviewsApi } from "~/lib/api/admin-api";
import { Button } from "~/ui/primitives/button";
import { Label } from "~/ui/primitives/label";
import { Textarea } from "~/ui/primitives/textarea";
import type { ReviewsPage } from "~/lib/types";

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(size, i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

/** Five radio buttons drawn as stars: arrow keys and screen readers work like any radio group */
function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const t = useTranslations("reviews");
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-1">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name="review-rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className={cn(
                "h-8 w-8 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"
              )}
            />
            <span className="sr-only">{t("starsCount", { count: n })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const { user, isPending } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(1);
  const { data, mutate, isLoading } = useApiGet<ReviewsPage>(
    // user id in the key: can_review and mine differ per viewer
    isPending ? null : `/products/${productId}/reviews?page=${page}&u=${user?.id ?? ""}`,
    () => reviewsApi.list(productId, page)
  );

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const summary = data?.summary;
  const mine = data?.mine ?? null;
  const showForm = data?.can_review === true && (!mine || editing);

  const startEdit = () => {
    setRating(mine?.rating ?? 0);
    setText(mine?.text ?? "");
    setEditing(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    const res = await reviewsApi.save(productId, { rating, text: text.trim() });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t("saved"));
    setEditing(false);
    mutate();
  };

  const togglePublished = async (id: number, isPublished: boolean) => {
    const res = await reviewsApi.setPublished(id, isPublished);
    if (res.error) toast.error(res.error.message);
    else mutate();
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "uk-UA", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section id="reviews" className="mt-16 scroll-mt-24" aria-labelledby="reviews-title" aria-busy={isLoading}>
      <h2 id="reviews-title" className="mb-6 text-2xl font-bold">
        {t("title")} {summary && summary.count > 0 && <span className="text-muted-foreground font-normal">({summary.count})</span>}
      </h2>

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          {summary && summary.count > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold tabular-nums">{summary.average.toFixed(1)}</span>
                <div>
                  <Stars value={summary.average} size="h-5 w-5" />
                  <p className="text-sm text-muted-foreground">{t("basedOn", { count: summary.count })}</p>
                </div>
              </div>
              <ul className="space-y-1.5" aria-label={t("distribution")}>
                {(["5", "4", "3", "2", "1"] as const).map((stars) => {
                  const n = summary.distribution[stars];
                  return (
                    <li key={stars} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{stars}★</span>
                      <span className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden>
                        <span className="block h-full bg-yellow-400" style={{ width: `${(n / summary.count) * 100}%` }} />
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        <span className="sr-only">{t("starsCount", { count: Number(stars) })}: </span>{n}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">{t("none")}</p>
          )}

          {!isPending && !user && (
            <p className="text-sm text-muted-foreground">
              <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">{t("signIn")}</Link>{" "}
              {t("signInSuffix")}
            </p>
          )}
          {data?.can_review === false && <p className="text-sm text-muted-foreground">{t("buyersOnly")}</p>}
          {data?.can_review === true && mine && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>{t("editMine")}</Button>
          )}
        </div>

        <div className="space-y-6">
          {showForm && (
            <form onSubmit={submit} className="space-y-3 rounded-lg border p-4 dark:border-border">
              <StarInput value={rating} onChange={setRating} label={t("yourRating")} />
              <div className="space-y-1.5">
                <Label htmlFor="review-text">{t("yourReview")}</Label>
                <Textarea id="review-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={3000}
                  placeholder={t("placeholder")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!rating || saving}>{saving ? t("saving") : t("publish")}</Button>
                {editing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t("cancel")}</Button>}
              </div>
            </form>
          )}

          <ul className="divide-y dark:divide-border">
            {data?.results.map((r) => (
              <li key={r.id} className={cn("py-4 space-y-1", !r.is_published && "opacity-60")}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="sr-only">{t("starsCount", { count: r.rating })}</span>
                    <span className="font-medium">{r.author_name || t("anonymousBuyer")}</span>
                    <span className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{t("verifiedBuyer")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <time dateTime={r.created_at} className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</time>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => togglePublished(r.id, !r.is_published)}
                        aria-label={r.is_published ? t("hide") : t("show")}>
                        {r.is_published ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </Button>
                    )}
                  </div>
                </div>
                {r.text && <p className="text-sm whitespace-pre-line">{r.text}</p>}
                {!r.is_published && <p className="text-xs text-muted-foreground">{t("hidden")}</p>}
              </li>
            ))}
          </ul>

          {(data?.previous || data?.next) && (
            <div className="flex justify-between">
              <Button variant="outline" size="sm" disabled={!data?.previous} onClick={() => setPage((p) => p - 1)}>{t("prev")}</Button>
              <Button variant="outline" size="sm" disabled={!data?.next} onClick={() => setPage((p) => p + 1)}>{t("next")}</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
