"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { productApi } from "~/lib/api/admin-api";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { Product } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { FadeIn } from "~/ui/components/motion/fade-in";
import { ProductCard } from "~/ui/components/product-card";

export default function WishlistPage() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const { items: wishlistIds, itemCount } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all(
      wishlistIds.map((id) =>
        productApi
          .getById(id)
          .then((res) => res.data)
          .catch(() => null),
      ),
    ).then((results) => {
      if (!cancelled) {
        setProducts(results.filter((p): p is Product => p !== null));
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [wishlistIds]);

  return (
    <main className="flex min-h-screen flex-col">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-3">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t("wishlist")}
              </h1>
              {itemCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({itemCount})
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 text-center">
                <p className="animate-pulse text-muted-foreground">
                  {tCommon("loading")}
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Heart className="mb-4 h-16 w-16 text-muted-foreground/40" />
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  {t("wishlistEmpty")}
                </h2>
                <p className="mb-6 max-w-md text-muted-foreground">
                  {t("wishlistEmptyDesc")}
                </p>
                <Button asChild>
                  <Link href="/products">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t("goShopping")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
