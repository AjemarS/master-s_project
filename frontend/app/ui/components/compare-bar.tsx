"use client";

import { Scale, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "~/i18n/navigation";
import { COMPARE_LIMIT, useCompare } from "~/lib/hooks/use-compare";
import { Button } from "~/ui/primitives/button";

/** Floating shortcut to the comparison while products are picked; hidden on the comparison itself */
export function CompareBar() {
  const t = useTranslations("compare");
  const { ids, clear } = useCompare();
  const pathname = usePathname();
  if (ids.length === 0 || pathname.startsWith("/compare")) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
      <div
        role="region"
        aria-label={t("barLabel")}
        className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur"
      >
        <Button asChild size="sm" className="rounded-full">
          <Link href="/compare">
            <Scale className="h-4 w-4" aria-hidden />
            {t("open", { count: ids.length, limit: COMPARE_LIMIT })}
          </Link>
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={clear} aria-label={t("clear")}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
