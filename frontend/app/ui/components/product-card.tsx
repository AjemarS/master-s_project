"use client";

import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/cn";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { useCart } from "~/lib/hooks/use-cart";
import { Product } from "~/lib/types";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardFooter } from "~/ui/primitives/card";
import { formatCurrency } from "~/lib/utils/format";
import { ProductImage } from "~/ui/components/product-image";
import { CompareButton } from "~/ui/components/compare-button";

type ProductCardProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> & {
  /** Return the add result (true/false) and the card tells the buyer how it went */
  onAddToCart?: (productId: number) => void | Promise<boolean | void>;
  onAddToWishlist?: (productId: number) => void;
  product: Product;
  variant?: "compact" | "default";
};

/**
 * The product name is the only link; its ::after stretches over the whole card so the card stays
 * clickable, while the wishlist, compare and cart buttons sit above it as siblings, not inside it.
 */
export const ProductCard = React.memo(function ProductCard({
  className,
  onAddToCart,
  product,
  variant = "default",
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
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const inWishlist = isInWishlist(product.id);
  const canBuy = product.in_stock && !!onAddToCart;

  const addToCart = async () => {
    const ok = await onAddToCart?.(product.id);
    if (ok === true) {
      setAddedTick((n) => n + 1);
      toast.success(t("addedToCart", { name: product.name }));
    }
    else if (ok === false) toast.error(t("addToCartFailed"));
  };

  const stars = (
    <div
      className="flex items-center"
      role="img"
      aria-label={t("ratingLabel", { rating: rating.toFixed(1), count: product.review_count ?? 0 })}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          aria-hidden
          className={cn(
            "h-4 w-4",
            i < Math.floor(rating)
              ? "fill-yellow-400 text-yellow-400"
              : i === Math.floor(rating) && rating % 1 >= 0.5
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-muted-foreground/40"
          )}
          key={i}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating.toFixed(1)} ({product.review_count})
      </span>
    </div>
  );

  return (
    <div className={cn("group h-full", className)} {...props}>
      <Card className="relative flex h-full flex-col overflow-hidden rounded-lg py-0 transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <ProductImage
            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            fill
            imageUrl={product.image_url}
            productId={product.id}
            productName={product.name}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm" variant="outline">
            {product.category_name}
          </Badge>

          {discount > 0 && (
            <Badge className="absolute bottom-2 left-2 bg-destructive text-white">
              {t("off", { discount })}
            </Badge>
          )}

          {!product.in_stock && (
            // Visual only: the stretched link underneath still opens the product
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
              <Badge className="px-3 py-1 text-sm" variant="destructive">{t("outOfStock")}</Badge>
            </div>
          )}

          <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                toggleItem(product.id);
                toast.success(inWishlist ? t("removedFromWishlist") : t("addedToWishlist"));
              }}
              aria-pressed={inWishlist}
              aria-label={inWishlist ? t("removeFromWishlist") : t("addToWishlist")}
              title={inWishlist ? t("removeFromWishlist") : t("addToWishlist")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart
                aria-hidden
                className={cn("h-4 w-4 transition-colors", inWishlist ? "fill-red-500 text-red-500" : "text-muted-foreground")}
              />
            </button>
            <CompareButton productId={product.id} look="overlay" />
          </div>
        </div>

        <CardContent className="flex-1 p-4 pt-4">
          <h3 className="min-h-[3rem] line-clamp-2 text-base font-medium transition-colors group-hover:text-primary">
            <Link
              href={`/products/${product.slug || product.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {product.name}
            </Link>
          </h3>

          {variant === "default" && (
            <>
              {/* No reviews is said in words: empty stars would read as a bad rating */}
              <div className="mt-1.5 min-h-5">
                {product.review_count ? stars : <span className="text-xs text-muted-foreground">{t("noReviewsYet")}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-semibold text-foreground">{formatCurrency(price)}</span>
                {discount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">{formatCurrency(originalPrice)}</span>
                )}
              </div>
            </>
          )}
        </CardContent>

        {variant === "default" && (
          <CardFooter className="relative z-10 p-4 pt-0">
            <Button
              className="w-full gap-2"
              variant={inCart ? "outline" : "default"}
              disabled={!canBuy}
              onClick={addToCart}
              aria-label={inCart ? t("inCartAddMore", { name: product.name }) : undefined}
            >
              {inCart ? (
                <Check
                  key={addedTick}
                  className="h-4 w-4 text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:spin-in-45 motion-safe:duration-300"
                  aria-hidden
                />
              ) : (
                <ShoppingCart className="h-4 w-4" aria-hidden />
              )}
              {!product.in_stock ? t("outOfStock") : inCart ? t("inCart") : t("addToCart")}
            </Button>
          </CardFooter>
        )}

        {variant === "compact" && (
          <CardFooter className="p-4 pt-0">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{formatCurrency(price)}</span>
                {originalPrice > 0 && (
                  <span className="text-sm text-muted-foreground line-through">{formatCurrency(originalPrice)}</span>
                )}
              </div>
              <Button
                className="relative z-10 h-10 w-10 rounded-full"
                disabled={!canBuy}
                onClick={addToCart}
                size="icon"
                variant="ghost"
                aria-label={t("addToCartSr")}
              >
                {inCart ? (
                  <Check key={addedTick} className="h-4 w-4 text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300" aria-hidden />
                ) : (
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
});
ProductCard.displayName = "ProductCard";
