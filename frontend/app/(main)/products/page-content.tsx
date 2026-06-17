"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import { useCart } from "~/lib/hooks/use-cart";
import { getImageUrl } from "~/lib/utils/image-url";
import { Product } from "~/lib/types";
import { ProductCard } from "~/ui/components/product-card";
import { Button } from "~/ui/primitives/button";
import { productApi } from "~/lib/api/admin-api";

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

export default function ProductsPageContent() {
  const { addItem } = useCart();
  const params = useSearchParams();

  /* ---------------------------- Products -------------------------------- */
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [page, setPage] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const pageSize = 20;

  /* ----------------------- Categories (derived) ------------------------- */
  const queryCategory = params.get("category");
  const initialCategory = queryCategory
    ? (queryCategory.charAt(0).toUpperCase() + queryCategory.slice(1)) as Product["category_name"]
    : "All";
  const [selectedCategory, setSelectedCategory] = React.useState<Product["category_name"]>(initialCategory);

  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const response = await productApi.getAll({
          page,
          pageSize,
          search: queryCategory && queryCategory !== "all" ? queryCategory : undefined,
        });

        if (response.data) {
          const products = response.data.results.map((product: Product) => ({
            ...product,
            price: Number(product.price),
            original_price: Number(product.original_price),
            rating: Number(product.rating),
          }));
          setProducts(products);
          setTotalCount(response.data.count);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [page, queryCategory]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* --------------------- Filtered products (memo) ----------------------- */
  const filteredProducts = React.useMemo(
    () =>
      selectedCategory === "All"
        ? products
        : products.filter((p) => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  const categories: string[] = React.useMemo(() => {
    // category_name is always a string from the API; no need to dig into `category` union
    const dynamic = Array.from(new Set(products.map((p) => p.category_name))).sort();
    return ["All", ...dynamic];
  }, [products]);

  /* --------------------------- Handlers --------------------------------- */
  const handleAddToCart = React.useCallback(
    (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        addItem(
          {
            category: product.category_name,
            id: String(product.id),
            image: getImageUrl(product.image_url),
            name: product.name,
            price: product.price,
          },
          1 // (quantity) always adds 1 item to the cart
        );
      }
    },
    [addItem, products]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages]
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
              {totalCount > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing page {page} of {totalPages} ({totalCount} products)
                </p>
              )}
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
              <p className="text-transparent bg-clip-text bg-linear-120 from-white to-black">Loading</p>
            </div>
          )}

          {/* Empty state */}
          {filteredProducts.length === 0 && !isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">No products found in this category.</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                variant="outline"
              >
                Previous
              </Button>

              {/* Page number buttons */}
              {(() => {
                const pageButtons: React.ReactNode[] = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
                const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                if (startPage > 1) {
                  pageButtons.push(
                    <Button key={1} onClick={() => handlePageChange(1)} variant="outline" size="sm">
                      1
                    </Button>
                  );
                  if (startPage > 2) {
                    pageButtons.push(
                      <span key="start-ellipsis" className="px-1 text-muted-foreground">
                        &hellip;
                      </span>
                    );
                  }
                }

                for (let i = startPage; i <= endPage; i++) {
                  pageButtons.push(
                    <Button
                      aria-current={i === page ? "page" : undefined}
                      key={i}
                      onClick={() => handlePageChange(i)}
                      variant={i === page ? "default" : "outline"}
                      size="sm"
                    >
                      {i}
                    </Button>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pageButtons.push(
                      <span key="end-ellipsis" className="px-1 text-muted-foreground">
                        &hellip;
                      </span>
                    );
                  }
                  pageButtons.push(
                    <Button
                      key={totalPages}
                      onClick={() => handlePageChange(totalPages)}
                      variant="outline"
                      size="sm"
                    >
                      {totalPages}
                    </Button>
                  );
                }

                return pageButtons;
              })()}

              <Button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                variant="outline"
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}