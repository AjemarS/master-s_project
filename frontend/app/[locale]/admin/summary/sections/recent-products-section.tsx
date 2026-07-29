"use client";

import { useTranslations } from "next-intl";
import { useRecentProducts } from "~/lib/hooks/use-recent-products";
import { formatCurrency } from "~/lib/utils/format";
import { RecentProductsCard } from "../dashboard";

export function RecentProductsSection() {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");
  const { recentProducts, clearRecent } = useRecentProducts();

  return (
    <RecentProductsCard
      products={recentProducts}
      onClear={clearRecent}
      tSum={tSum}
      tc={tc}
      formatCurrency={formatCurrency}
    />
  );
}
