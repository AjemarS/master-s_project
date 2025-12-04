"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import { useCart } from "~/lib/hooks/use-cart";
import { ProductCard } from "~/ui/components/product-card";
import { Button } from "~/ui/primitives/button";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface Product {
  category_name: string;
  id: string;
  image: string;
  inStock?: boolean;
  name: string;
  originalPrice: number;
  price: number;
  rating: number;
}

/* -------------------------------------------------------------------------- */
/*                            Helpers / utilities                             */
/* -------------------------------------------------------------------------- */

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

/* -------------------------------------------------------------------------- */
/*                              Component                                     */
/* -------------------------------------------------------------------------- */

export default function ProductsPage() {
  const { addItem } = useCart();

  /* ---------------------------- Products -------------------------------- */
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  React.useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("http://localhost/api/products/", {
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
        const products = data.results.map((product: Product) => ({
          ...product,
          price: Number(product.price),
          originalPrice: Number(product.originalPrice),
          rating: Number(product.rating),
        }));

        setProducts(products);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  /* ----------------------- Categories (derived) ------------------------- */
  const categories: Product["category_name"][] = React.useMemo(() => {
    const dynamic = Array.from(new Set(products.map((p) => p.category_name))).sort();
    return ["All", ...dynamic];
  }, [products]);

  /* ----------------------------- State ---------------------------------- */
  const [selectedCategory, setSelectedCategory] = React.useState<Product["category_name"]>("All");

  /* ----------------------- Category in query ---------------------------- */
  const params = useSearchParams();
  const category = params.get("category");

  React.useEffect(() => {
    if (category) {
      setSelectedCategory(category.charAt(0).toUpperCase() + category.slice(1));
    }
  }, [category]);

  /* --------------------- Filtered products (memo) ----------------------- */
  const filteredProducts = React.useMemo(
    () =>
      selectedCategory === "All"
        ? products
        : products.filter((p) => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  /* --------------------------- Handlers --------------------------------- */
  const handleAddToCart = React.useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        addItem(
          {
            category: product.category_name,
            id: product.id,
            image: product.image,
            name: product.name,
            price: product.price,
          },
          1 // (quantity) always adds 1 item to the cart
        );
      }
    },
    [addItem, products]
  );

  /* ----------------------------- Render --------------------------------- */
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div
          className={`
            container px-4
            md:px-6
          `}
        >
          {/* Heading & filters */}
          <div
            className={`
              mb-8 flex flex-col gap-4
              md:flex-row md:items-center md:justify-between
            `}
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                Browse our latest products and find something you&apos;ll love.
              </p>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  aria-pressed={category === selectedCategory}
                  className="rounded-full"
                  key={slugify(category)}
                  onClick={() => {
                    setSelectedCategory(category);
                  }}
                  size="sm"
                  title={`Filter by ${category}`}
                  variant={category === selectedCategory ? "default" : "outline"}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div
            className={`
              grid grid-cols-1 gap-6
              sm:grid-cols-2
              md:grid-cols-3
              lg:grid-cols-4
            `}
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} onAddToCart={handleAddToCart} product={product} />
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-transparent bg-clip-text bg-linear-120 from-white to-black">Loading </p>
            </div>
          )}

          {/* Empty state */}
          {filteredProducts.length === 0 && !isLoading &&  (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">No products found in this category.</p>
            </div>
          )}

          {/* Pagination */}
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            <Button disabled variant="outline">
              Previous
            </Button>
            <Button aria-current="page" variant="default">
              1
            </Button>
            <Button disabled variant="outline">
              Next
            </Button>
          </nav>
        </div>
      </main>
    </div>
  );
}
