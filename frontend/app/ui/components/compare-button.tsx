"use client";

import { Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "~/lib/cn";
import { COMPARE_LIMIT, useCompare } from "~/lib/hooks/use-compare";
import { Button } from "~/ui/primitives/button";

interface CompareButtonProps {
  productId: number;
  /** "overlay": round icon on a product card image; "outline": next to the buy button */
  look?: "overlay" | "outline";
  className?: string;
}

export function CompareButton({ productId, look = "outline", className }: CompareButtonProps) {
  const t = useTranslations("compare");
  const { toggle, has } = useCompare();
  const active = has(productId);
  const label = active ? t("remove") : t("add");

  const onClick = (e: React.MouseEvent) => {
    // On a card the button sits inside the product link
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(productId);
    if (result === "full") toast.error(t("full", { limit: COMPARE_LIMIT }));
    else if (result === "added") toast.success(t("added"));
  };

  if (look === "overlay") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background",
          className
        )}
      >
        <Scale className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="icon"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn("h-12 w-12 shrink-0", className)}
    >
      <Scale className={cn("h-5 w-5", active && "text-primary")} aria-hidden />
    </Button>
  );
}
