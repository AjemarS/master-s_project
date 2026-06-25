"use client";

import { ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { cn } from "~/lib/cn";
import { getImageUrl } from "~/lib/utils/image-url";
import { Product } from "~/lib/types";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardFooter } from "~/ui/primitives/card";

type ProductCardProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onError"> & {
  onAddToCart?: (productId: number) => void;
  onAddToWishlist?: (productId: number) => void;
  product: Product;
  variant?: "compact" | "default";
};

export const ProductCard = React.memo(function ProductCard({
  className,
  onAddToCart,
  product,
  variant = "default",
  ...props
}: ProductCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);

  const price =
    typeof product.price === "number" ? product.price : Number(product.price);
  const originalPrice = product.original_price
    ? typeof product.original_price === "number"
      ? product.original_price
      : Number(product.original_price)
    : 0;
  const rating =
    typeof product.rating === "number" ? product.rating : Number(product.rating);
  const imageSrc = getImageUrl(product.image_url);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart) {
      setIsAddingToCart(true);
      setTimeout(() => {
        onAddToCart(product.id);
        setIsAddingToCart(false);
      }, 600);
    }
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const renderStars = () => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            className={cn(
              "h-4 w-4",
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalfStar
                ? "fill-yellow-400/50 text-yellow-400"
                : "stroke-muted/40 text-muted"
            )}
            key={`star-${product.id}-position-${i + 1}`}
          />
        ))}
        {rating > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
        )}
      </div>
    );
  };

  return (
    <div className={cn("group", className)} {...props}>
      <Link href={`/products/${product.id}`}>
        <Card
          className={cn(
            "relative h-full overflow-hidden rounded-lg py-0 transition-all duration-200 ease-in-out hover:shadow-md",
            isHovered && "ring-1 ring-primary/20"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            {imageSrc && (
              <Image
                alt={product.name}
                className={cn(
                  "object-cover transition-transform duration-300 ease-in-out",
                  isHovered && "scale-105"
                )}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                src={imageSrc}
              />
            )}

            <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm" variant="outline">
              {product.category_name}
            </Badge>

            {discount > 0 && (
              <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                {discount}% OFF
              </Badge>
            )}
          </div>

          <CardContent className="p-4 pt-4">
            <h3 className="line-clamp-2 text-base font-medium transition-colors group-hover:text-primary">
              {product.name}
            </h3>

            {variant === "default" && (
              <>
                <div className="mt-1.5">{renderStars()}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="font-medium text-foreground">₴{price.toFixed(2)}</span>
                  {originalPrice > 0 && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₴{originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>

          {variant === "default" && (
            <CardFooter className="p-4 pt-0">
              <Button
                className={cn("w-full gap-2 transition-all", isAddingToCart && "opacity-70")}
                disabled={isAddingToCart}
                onClick={handleAddToCart}
              >
                {isAddingToCart ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Add to Cart
              </Button>
            </CardFooter>
          )}

          {variant === "compact" && (
            <CardFooter className="p-4 pt-0">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">₴{price.toFixed(2)}</span>
                  {originalPrice > 0 && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₴{originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <Button
                  className="h-8 w-8 rounded-full"
                  disabled={isAddingToCart}
                  onClick={handleAddToCart}
                  size="icon"
                  variant="ghost"
                >
                  {isAddingToCart ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  <span className="sr-only">Add to cart</span>
                </Button>
              </div>
            </CardFooter>
          )}

          {!product.in_stock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <Badge className="px-3 py-1 text-sm" variant="destructive">
                Out of Stock
              </Badge>
            </div>
          )}
        </Card>
      </Link>
    </div>
  );
});
ProductCard.displayName = "ProductCard";