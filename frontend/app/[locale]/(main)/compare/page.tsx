"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Minus, Scale, ShoppingCart, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/cn";
import { productApi } from "~/lib/api/admin-api";
import { useApiGet } from "~/lib/hooks/use-api";
import { useCart } from "~/lib/hooks/use-cart";
import { useCompare } from "~/lib/hooks/use-compare";
import { formatPrice } from "~/lib/utils/format";
import { getImageUrl } from "~/lib/utils/image-url";
import type { Product } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { Switch } from "~/ui/primitives/switch";
import { Label } from "~/ui/primitives/label";
import { ProductImage } from "~/ui/components/product-image";

type Row = { key: string; label: string; values: React.ReactNode[]; raw: string[] };

const asText = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));

export default function ComparePage() {
  const t = useTranslations("compare");
  const locale = useLocale();
  const { ids, remove, clear } = useCompare();
  const { addItem } = useCart();
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const key = ids.length ? `/products?ids=${[...ids].sort((a, b) => a - b).join(",")}` : null;
  const { data, error, isLoading } = useApiGet(key, () => productApi.getAll({ ids: ids.join(","), pageSize: ids.length }));
  // Keep the order the buyer added them in
  const products = useMemo(
    () => ids.map((id) => data?.results.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [ids, data]
  );

  const rows = useMemo<Row[]>(() => {
    const base: Row[] = [
      {
        key: "price", label: t("price"),
        raw: products.map((p) => String(p.price)),
        values: products.map((p) => <span key={p.id} className="font-semibold text-primary">{formatPrice(p, locale).price}</span>),
      },
      {
        key: "rating", label: t("rating"),
        raw: products.map((p) => (p.review_count ? `${p.rating}` : "")),
        values: products.map((p) =>
          p.review_count ? (
            <span key={p.id} className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
              {Number(p.rating).toFixed(1)} <span className="text-muted-foreground">({p.review_count})</span>
            </span>
          ) : null
        ),
      },
      { key: "brand", label: t("brand"), raw: products.map((p) => asText(p.brand)), values: products.map((p) => asText(p.brand)) },
      { key: "category", label: t("category"), raw: products.map((p) => p.category_name), values: products.map((p) => p.category_name) },
      {
        key: "warranty", label: t("warranty"),
        raw: products.map((p) => asText(p.warranty_months)),
        values: products.map((p) => (p.warranty_months ? t("months", { count: p.warranty_months }) : null)),
      },
      {
        key: "stock", label: t("availability"),
        raw: products.map((p) => String(p.in_stock)),
        values: products.map((p) => (p.in_stock ? t("inStock") : t("outOfStock"))),
      },
    ];

    // Every spec any of the products has, in first-seen order
    const specKeys = [...new Set(products.flatMap((p) => Object.keys(p.specs ?? {})))];
    const specs: Row[] = specKeys.map((k) => {
      const raw = products.map((p) => asText(p.specs?.[k]));
      return { key: `spec:${k}`, label: k, raw, values: raw.map((v) => v || null) };
    });

    const featureNames = [...new Set(products.flatMap((p) => (p.features ?? []).filter((f): f is string => typeof f === "string")))];
    const features: Row[] = featureNames.map((f) => {
      const raw = products.map((p) => String((p.features ?? []).includes(f)));
      return {
        key: `feature:${f}`, label: f, raw,
        values: raw.map((has, i) =>
          has === "true"
            ? <Check key={i} className="h-4 w-4 text-green-600 dark:text-green-400" aria-label={t("yes")} />
            : <Minus key={i} className="h-4 w-4 text-muted-foreground" aria-label={t("no")} />
        ),
      };
    });
    return [...base, ...specs, ...features];
  }, [products, locale, t]);

  const differs = (r: Row) => new Set(r.raw).size > 1;
  const visible = onlyDifferences ? rows.filter(differs) : rows;
  const mixedCategories = new Set(products.map((p) => p.category_name)).size > 1;

  if (ids.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center space-y-4">
        <Scale className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("empty")}</p>
        <Button asChild><Link href="/products">{t("toCatalog")}</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Scale className="h-7 w-7 text-primary" aria-hidden />
          {t("title")}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="only-diff" checked={onlyDifferences} onCheckedChange={setOnlyDifferences} />
            <Label htmlFor="only-diff">{t("onlyDifferences")}</Label>
          </div>
          <Button variant="outline" size="sm" onClick={clear}>{t("clearAll")}</Button>
        </div>
      </div>

      {mixedCategories && <p className="mb-4 text-sm text-muted-foreground">{t("mixedCategories")}</p>}

      {isLoading && !data ? (
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      ) : products.length === 0 ? (
        <p role="alert" className="rounded-lg border p-6 text-center text-muted-foreground dark:border-border">
          {error ? t("loadFailed") : t("gone")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border dark:border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr className="border-b dark:border-border align-top">
                <th scope="col" className="w-48 p-3 text-left font-medium text-muted-foreground">
                  {t("selected", { count: products.length })}
                </th>
                {products.map((p) => (
                  <th key={p.id} scope="col" className="p-3 text-left font-normal">
                    <div className="space-y-2">
                      <div className="relative aspect-square w-28 overflow-hidden rounded-md bg-muted">
                        <ProductImage fill imageUrl={p.image_url} productId={p.id} productName={p.name} sizes="7rem" />
                      </div>
                      <Link href={`/products/${p.slug || p.id}`} className="block font-medium hover:underline underline-offset-4 line-clamp-2">
                        {p.name}
                      </Link>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          disabled={!p.in_stock}
                          onClick={() => {
                            addItem({ id: String(p.id), name: p.name, price: p.price, slug: p.slug, image: getImageUrl(p.image_url), category: p.category_name }, 1);
                            toast.success(t("addedToCart"));
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" aria-hidden />
                          <span className="sr-only sm:not-sr-only">{t("buy")}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p.id)} aria-label={t("removeNamed", { name: p.name })}>
                          <X className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.key} className={cn("border-b last:border-0 dark:border-border", differs(r) && "bg-primary/5")}>
                  <th scope="row" className="p-3 text-left font-medium text-muted-foreground">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={products[i].id} className="p-3">{v ?? <span className="text-muted-foreground">—</span>}</td>
                  ))}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={products.length + 1} className="p-6 text-center text-muted-foreground">{t("noDifferences")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {products.length < 2 && <p className="mt-4 text-sm text-muted-foreground">{t("addMore")}</p>}
    </div>
  );
}
