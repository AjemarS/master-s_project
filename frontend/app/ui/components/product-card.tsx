"use client";

import { Check, Heart, MessageSquare, ShoppingCart, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/cn";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { useCart } from "~/lib/hooks/use-cart";
import { Product } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { formatCurrency } from "~/lib/utils/format";
import { ProductImage } from "~/ui/components/product-image";
import { CompareButton } from "~/ui/components/compare-button";

type ProductCardProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> & {
  /** Return the add result (true/false) and the card tells the buyer how it went */
  onAddToCart?: (productId: number) => void | Promise<boolean | void>;
  product: Product;
};

/**
 * Flat catalog card: whole photo, compare/wishlist icons in the corner, name, rating, then the
 * price on the left and a square cart button on the right.
 * The product name is the only link; its ::after stretches over the whole card so the card stays
 * clickable, while the buttons sit above it as siblings, not inside it.
 */
export const ProductCard = React.memo(function ProductCard({
  className,
  onAddToCart,
  product,
  ...props
}: ProductCardProps) {
  const t = useTranslations("products");
  const { isInWishlist, toggleItem } = useWishlist();
  const { items: cartItems } = useCart();
  const inCart = cartItems.some((i) => i.id === String(product.id));
  // Bumped on every successful add so the check mark replays its pop
  const [addedTick, setAddedTick] = React.useState(0);

  const price = Number(product.price);
  const originalPrice = product.original_price ? Number(product.original_price) : 0;
  const rating = Number(product.rating);
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const inWishlist = isInWishlist(product.id);
  const canBuy = product.in_stock && !!onAddToCart;

  const addToCart = async () => {
    const ok = await onAddToCart?.(product.id);
    if (ok === true) {
      setAddedTick((n) => n + 1);
      toast.success(t("addedToCart", { name: product.name }));
    } else if (ok === false) toast.error(t("addToCartFailed"));
  };

  const cornerIcon =
    "h-9 w-9 rounded-md bg-transparent backdrop-blur-none text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className={cn("group h-full", className)} {...props}>
      <div className="relative flex h-full flex-col rounded-lg border bg-card p-2 sm:p-3 transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
        {/* Photo: shown whole, never cropped */}
        <div className="relative aspect-square">
          <ProductImage
            className="object-contain px-6 py-1 sm:px-9 sm:py-2 transition-transform duration-300 ease-in-out group-hover:scale-[1.03] motion-reduce:transition-none"
            fill
            imageUrl={product.image_url}
            productId={product.id}
            productName={product.name}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {discount > 0 && (
            <span className="absolute top-0 left-0 rounded bg-destructive px-1.5 py-0.5 text-xs font-semibold text-white">
              {t("off", { discount })}
            </span>
          )}
          {!product.in_stock && (
            // Visual only: the stretched link underneath still opens the product
            <div className="pointer-events-none absolute inset-0 bg-background/60" />
          )}
          <div className="absolute top-0 right-0 z-10 flex flex-col">
            <CompareButton productId={product.id} look="overlay" className={cornerIcon} />
            <button
              type="button"
              onClick={() => {
                toggleItem(product.id);
                toast.success(inWishlist ? t("removedFromWishlist") : t("addedToWishlist"));
              }}
              aria-pressed={inWishlist}
              aria-label={inWishlist ? t("removeFromWishlist") : t("addToWishlist")}
              title={inWishlist ? t("removeFromWishlist") : t("addToWishlist")}
              className={cn("flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", cornerIcon)}
            >
              <Heart aria-hidden className={cn("h-4 w-4", inWishlist && "fill-red-500 text-red-500")} />
            </button>
          </div>
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 transition-colors group-hover:text-primary">
          <Link
            href={`/products/${product.slug || product.id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        {/* Stars and the review count; without reviews it says so instead of showing empty stars */}
        <div className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {product.review_count ? (
            <>
              <span
                className="flex items-center"
                role="img"
                aria-label={t("ratingLabel", { rating: rating.toFixed(1), count: product.review_count })}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    aria-hidden
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
                    )}
                  />
                ))}
              </span>
              <span className="flex items-center gap-1" aria-hidden>
                <MessageSquare className="h-3.5 w-3.5" />
                {product.review_count}
              </span>
            </>
          ) : (
            <span>{t("noReviewsYet")}</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            {discount > 0 && (
              <div className="whitespace-nowrap text-xs text-muted-foreground line-through">{formatCurrency(originalPrice, "ua", true)}</div>
            )}
            <div className={cn("whitespace-nowrap text-base font-bold leading-tight sm:text-lg", discount > 0 ? "text-destructive" : "text-foreground")}>
              {formatCurrency(price, "ua", true)}
            </div>
            {!product.in_stock && <div className="text-xs text-muted-foreground">{t("outOfStock")}</div>}
          </div>
          {product.in_stock && (
            <Button
              size="icon"
              variant={inCart ? "outline" : "default"}
              className="relative z-10 h-9 w-9 shrink-0 sm:h-10 sm:w-10"
              disabled={!canBuy}
              onClick={addToCart}
              aria-label={inCart ? t("inCartAddMore", { name: product.name }) : `${t("addToCartSr")}: ${product.name}`}
              title={inCart ? t("inCart") : t("addToCart")}
            >
              {inCart ? (
                <Check
                  key={addedTick}
                  className="h-5 w-5 text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:spin-in-45 motion-safe:duration-300"
                  aria-hidden
                />
              ) : (
                <ShoppingCart className="h-5 w-5" aria-hidden />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
ProductCard.displayName = "ProductCard";
