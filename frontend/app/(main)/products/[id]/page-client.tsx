"use client";

import { Minus, Plus, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useCart } from "~/lib/hooks/use-cart";
import { getImageUrl } from "~/lib/utils/image-url";
import { ProductDetail } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { Separator } from "~/ui/primitives/separator";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const range = (length: number) => Array.from({ length }, (_, i) => i);

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { addItem } = useCart();

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
        image: getImageUrl(product.image_url),
        name: product.name,
        price: product.price,
      },
      quantity
    );
    setQuantity(1);
    toast.success(`${product.name} added to cart`);
    await new Promise((r) => setTimeout(r, 400));
    setIsAdding(false);
  }, [addItem, product, quantity]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div className="container px-4 md:px-6">
          <Button
            aria-label="Back to products"
            className="mb-6"
            onClick={() => router.push("/products")}
            variant="ghost"
          >
            ← Back to Products
          </Button>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                alt={product.name}
                className="object-cover"
                fill
                priority
                src={getImageUrl(product.image_url)}
              />
              {discountPercentage > 0 && (
                <div className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  -{discountPercentage}%
                </div>
              )}
            </div>

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
                <p className="text-lg font-medium text-muted-foreground">{product.category.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {CURRENCY_FORMATTER.format(product.price)}
                  </span>
                  {product.original_price && (
                    <span className="text-xl text-muted-foreground line-through">
                      {CURRENCY_FORMATTER.format(product.original_price)}
                    </span>
                  )}
                </div>
              </div>

              <p className="mb-6 text-muted-foreground">{product.description}</p>

              <div aria-atomic="true" aria-live="polite" className="mb-6">
                {product.in_stock ? (
                  <p className="text-sm font-medium text-green-600">In Stock</p>
                ) : (
                  <p className="text-sm font-medium text-red-500">Out of Stock</p>
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
                  className="flex-1"
                  disabled={!product.in_stock || isAdding}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isAdding ? "Adding\u2026" : "Add to Cart"}
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-4 text-2xl font-bold">Features</h2>
              <ul className="space-y-2">
                {product.features.map((feature) => (
                  <li className="flex items-start" key={`feature-${product.id}-${slugify(feature)}`}>
                    <span className="mt-2.5 mr-2 h-2 w-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-4 text-2xl font-bold">Specifications</h2>
              <div className="space-y-2">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div className="flex justify-between border-b pb-2 text-sm" key={key}>
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}