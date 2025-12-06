"use client";

import { Minus, Plus, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useCart } from "~/lib/hooks/use-cart";
import {  ProductDetail } from "~/lib/types";
import { Button } from "~/ui/primitives/button";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                         Helpers (shared, memo-safe)                        */
/* -------------------------------------------------------------------------- */

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

/** `feature -> feature` ➜ `feature-feature` (for React keys) */
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

/** Build an integer array `[0,…,length-1]` once */
const range = (length: number) => Array.from({ length }, (_, i) => i);

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export default function ProductDetailPage() {
  /* ----------------------------- Routing --------------------------------- */
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  /* ------------------------------- Products --------------------------------- */

  const [product, setProduct] = React.useState<ProductDetail>();
  React.useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`http://localhost/api/products/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();

        // Transform input data as needed
        const product: ProductDetail = {
          ...data,
          price: Number(data.price),
          originalPrice: Number(data.originalPrice),
          rating: Number(data.rating),
        };

        setProduct(product);
      } catch (error) {
        console.error(error);
      }
    }
    fetchProduct();
  }, [id]);

  /* ----------------------------- Cart hook ------------------------------- */
  const { addItem } = useCart();

  /* ----------------------------- Local state ----------------------------- */
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);

  /* ----------------------- Derived/computed values ----------------------- */
  const discountPercentage = React.useMemo(() => {
    if (!product?.originalPrice) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }, [product]);

  /* ------------------------------ Handlers ------------------------------- */
  const handleQuantityChange = React.useCallback((newQty: number) => {
    setQuantity((prev) => (newQty >= 1 ? newQty : prev));
  }, []);

  const handleAddToCart = React.useCallback(async () => {
    if (!product) return;

    setIsAdding(true);
    addItem(
      {
        category: product.category.name,
        id: product.id,
        image: product.image,
        name: product.name,
        price: product.price,
      },
      quantity
    );
    setQuantity(1);
    toast.success(`${product.name} added to cart`);
    await new Promise((r) => setTimeout(r, 400)); // fake latency
    setIsAdding(false);
  }, [addItem, product, quantity]);

  /* -------------------------- Conditional UI ---------------------------- */
  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 py-10">
          <div
            className={`
              container px-4
              md:px-6
            `}
          >
            <h1 className="text-3xl font-bold">Product Not Found</h1>
            <p className="mt-4">The product you&apos;re looking for doesn&apos;t exist.</p>
            <Button className="mt-6" onClick={() => router.push("/products")}>
              Back to Products
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ------------------------------ Markup --------------------------------- */
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div
          className={`
            container px-4
            md:px-6
          `}
        >
          {/* Back link */}
          <Button
            aria-label="Back to products"
            className="mb-6"
            onClick={() => router.push("/products")}
            variant="ghost"
          >
            ← Back to Products
          </Button>

          {/* Main grid */}
          <div
            className={`
              grid grid-cols-1 gap-8
              md:grid-cols-2
            `}
          >
            {/* ------------------------ Product image ------------------------ */}
            <div
              className={`
                relative aspect-square overflow-hidden rounded-lg bg-muted
              `}
            >
              <Image
                alt={product.name}
                className="object-cover"
                fill
                priority
                src={product.image}
                unoptimized
              />
              {discountPercentage > 0 && (
                <div
                  className={`
                    absolute top-2 left-2 rounded-full bg-red-500 px-2 py-1
                    text-xs font-bold text-white
                  `}
                >
                  -{discountPercentage}%
                </div>
              )}
            </div>

            {/* ---------------------- Product info -------------------------- */}
            <div className="flex flex-col">
              {/* Title & rating */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold">{product.name}</h1>

                <div className="mt-2 flex items-center gap-2">
                  {/* Stars */}
                  <div
                    aria-label={`Rating ${product.rating} out of 5`}
                    className="flex items-center"
                  >
                    {range(5).map((i) => (
                      <Star
                        className={`
                          h-5 w-5
                          ${
                            i < Math.floor(product.rating)
                              ? "fill-primary text-primary"
                              : i < product.rating
                              ? "fill-primary/50 text-primary"
                              : "text-muted-foreground"
                          }
                        `}
                        key={`star-${i}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({product.rating.toFixed(1)})
                  </span>
                </div>
              </div>

              {/* Category & prices */}
              <div className="mb-6">
                <p className="text-lg font-medium text-muted-foreground">{product.category.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {CURRENCY_FORMATTER.format(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xl text-muted-foreground line-through">
                      {CURRENCY_FORMATTER.format(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="mb-6 text-muted-foreground">{product.description}</p>

              {/* Stock */}
              <div aria-atomic="true" aria-live="polite" className="mb-6">
                {product.inStock ? (
                  <p className="text-sm font-medium text-green-600">In Stock</p>
                ) : (
                  <p className="text-sm font-medium text-red-500">Out of Stock</p>
                )}
              </div>

              {/* Quantity selector & Add to cart */}
              <div
                className={`
                  mb-6 flex flex-col gap-4
                  sm:flex-row sm:items-center
                `}
              >
                {/* Quantity */}
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

                {/* Add to cart */}
                <Button
                  className="flex-1"
                  disabled={!product.inStock || isAdding}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isAdding ? "Adding…" : "Add to Cart"}
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* ---------------------- Features & Specs ------------------------ */}
          <div
            className={`
              grid grid-cols-1 gap-8
              md:grid-cols-2
            `}
          >
            {/* Features */}
            <section>
              <h2 className="mb-4 text-2xl font-bold">Features</h2>
              <ul className="space-y-2">
                {product.features.map((feature) => (
                  <li
                    className="flex items-start"
                    key={`feature-${product.id}-${slugify(feature)}`}
                  >
                    <span className="mt-2.5 mr-2 h-2 w-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Specifications */}
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
