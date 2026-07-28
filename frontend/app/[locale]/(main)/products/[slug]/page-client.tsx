"use client";

import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useCart } from "~/lib/hooks/use-cart";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { getImageUrl } from "~/lib/utils/image-url";
import { formatPrice } from "~/lib/utils/format";
import { ProductDetail, Product } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { Separator } from "~/ui/primitives/separator";
import { ProductCard } from "~/ui/components/product-card";
import { ProductGallery } from "~/ui/components/product-gallery";
import { productApi } from "~/lib/api/admin-api";
import { useBreadcrumbSegments } from "~/ui/components/breadcrumbs";

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const range = (length: number) => Array.from({ length }, (_, i) => i);

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const t = useTranslations("products");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations();
  const locale = useLocale();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { setSegments } = useBreadcrumbSegments();
  const [similar, setSimilar] = React.useState<Product[]>([]);
  const priceInfo = React.useMemo(() => formatPrice(product, locale), [product, locale]);

  React.useEffect(() => {
    let cancelled = false;
    productApi.getSimilar(product.id).then((res) => {
      if (cancelled) return;
      if (res.data) {
        setSimilar(res.data.filter((p) => p.id !== product.id).slice(0, 4));
      }
    }).catch((err) => console.error("Failed to fetch similar products:", err));
    return () => { cancelled = true; };
  }, [product.id]);

  React.useEffect(() => {
    setSegments([
      { label: tCommon("nav.home"), href: "/" },
      { label: tNav("products"), href: "/products" },
      { label: product.name },
    ]);
    return () => setSegments(null);
  }, [product.name, tCommon, tNav, setSegments]);

  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);

  const discountPercentage = React.useMemo(() => {
    if (!product?.original_price) return 0;
    return Math.round(((product.original_price - product.price) / product.original_price) * 100);
  }, [product]);

  const handleQuantityChange = React.useCallback((newQty: number) => {
    setQuantity((prev) => (newQty >= 1 ? newQty : prev));
  }, []);

  const handleAddToCart = React.useCallback(async () => {
    if (!product) return;

    setIsAdding(true);
    addItem(
      {
        category: product.category.name,
        id: String(product.id),
        slug: product.slug,
        image: getImageUrl(product.image_url),
        name: product.name,
        price: product.price,
      },
      quantity
    );
    setQuantity(1);
    toast.success(t("addedToCart", { name: product.name }));
    await new Promise((r) => setTimeout(r, 400));
    setIsAdding(false);
  }, [addItem, product, quantity, t]);

  return (
    <div className="flex flex-col">
      <main className="flex-1 py-10">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <ProductGallery
              imageUrl={product.image_url}
              productId={product.id}
              productName={product.name}
              discountPercentage={discountPercentage}
            />

            <div className="flex flex-col">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <div aria-label={`Rating ${product.rating} out of 5`} className="flex items-center">
                    {range(5).map((i) => (
                      <Star
                        className={`h-5 w-5 ${
                          i < Math.floor(product.rating)
                            ? "fill-primary text-primary"
                            : i < product.rating
                            ? "fill-primary/50 text-primary"
                            : "text-muted-foreground"
                        }`}
                        key={`star-${i}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({product.rating.toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{product.category.name}</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-bold text-primary">{priceInfo.price}</span>
                  {priceInfo.originalPrice && (
                    <span className="text-xl text-muted-foreground line-through">{priceInfo.originalPrice}</span>
                  )}
                </div>
              </div>

              <p className="mb-6 text-muted-foreground">{product.description}</p>

              <div aria-atomic="true" aria-live="polite" className="mb-6">
                {product.in_stock ? (
                  <p className="text-sm font-medium text-primary">{t("inStock")}</p>
                ) : (
                  <p className="text-sm font-medium text-destructive">{t("outOfStock")}</p>
                )}
              </div>

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center">
                  <Button
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => handleQuantityChange(quantity - 1)}
                    size="icon"
                    variant="outline"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center select-none">{quantity}</span>
                  <Button
                    aria-label="Increase quantity"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    size="icon"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  className="flex-1 shadow-sm"
                  disabled={!product.in_stock || isAdding}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isAdding ? t("adding") : t("addToCart")}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => toggleItem(product.id)}
                  aria-label={
                    isInWishlist(product.id)
                      ? "Видалити з обраного"
                      : "Додати до обраного"
                  }
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isInWishlist(product.id)
                        ? "fill-red-500 text-red-500"
                        : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t("features")}</h2>
              <ul className="space-y-2">
                {product.features.map((feature) => (
                  <li className="flex items-start" key={`feature-${product.id}-${slugify(feature)}`}>
                    <span className="mt-2.5 mr-2 h-2 w-2 rounded-full bg-accent-electric" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t("specs")}</h2>
              <div className="space-y-1">
                {Object.entries(product.specs).map(([key, value], idx) => (
                  <div className={`flex justify-between rounded-sm px-2 py-2 text-sm ${idx % 2 === 0 ? 'bg-muted/30' : ''}`} key={key}>
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {similar.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-2xl font-bold">{t("similarProducts")}</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {similar.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      ...p,
                      price: Number(p.price),
                      original_price: Number(p.original_price),
                      rating: Number(p.rating),
                    }}
                    onAddToCart={(id) => {
                      addItem({ id: String(id), name: p.name, price: p.price, slug: p.slug, image: getImageUrl(p.image_url), category: p.category_name }, 1);
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}