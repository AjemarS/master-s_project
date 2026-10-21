"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "~/i18n/navigation";
import { productApi } from "~/lib/api/admin-api";
import { useApiGet } from "~/lib/hooks/use-api";
import { useCart } from "~/lib/hooks/use-cart";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { getImageUrl } from "~/lib/utils/image-url";
import { Button } from "~/ui/primitives/button";
import { ErrorAlert } from "~/ui/components/error-alert";
import { FadeIn } from "~/ui/components/motion/fade-in";
import { ProductCard } from "~/ui/components/product-card";

export default function WishlistPage() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const { items: wishlistIds, itemCount, isHydrated } = useWishlist();
  const { addItem } = useCart();

  // One request for the whole list instead of one per product
  const ids = [...wishlistIds].sort((a, b) => a - b).join(",");
  const { data, error, isLoading: loading } = useApiGet(
    isHydrated && ids ? `/products?ids=${ids}` : null,
    () => productApi.getAll({ ids, pageSize: 100 })
  );
  const products = wishlistIds.map((id) => data?.results.find((p) => p.id === id)).filter((p) => !!p);
  const isLoading = !isHydrated || (!!ids && loading && !data);

  return (
    <div className="flex min-h-dvh flex-col">
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

            <ErrorAlert message={error?.message ?? null} />

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
                    onAddToCart={() =>
                      addItem({ id: String(product.id), name: product.name, price: product.price, slug: product.slug, image: getImageUrl(product.image_url), category: product.category_name }, 1)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
