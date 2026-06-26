"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { useCart } from "~/lib/hooks/use-cart";
import { getImageUrl } from "~/lib/utils/image-url";
import { Product } from "~/lib/types";
import { ProductCard } from "~/ui/components/product-card";
import { Button } from "~/ui/primitives/button";
import { productApi } from "~/lib/api/admin-api";

const slugify = (str: string) =>
  str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

export default function ProductsPageContent() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { addItem } = useCart();
  const params = useSearchParams();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [page, setPage] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const pageSize = 20;

  const categoryParam = params.get("category");
  const categoryId = categoryParam ? Number(categoryParam) : undefined;
  const validCategoryId = categoryId && !Number.isNaN(categoryId) ? categoryId : undefined;

  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const response = await productApi.getAll({
          page,
          pageSize,
          category: validCategoryId,
        });

        if (response.data) {
          const mapped = response.data.results.map((product: Product) => ({
            ...product,
            price: Number(product.price),
            original_price: Number(product.original_price),
            rating: Number(product.rating),
          }));
          setProducts(mapped);
          setTotalCount(response.data.count);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [page, validCategoryId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const categories: string[] = React.useMemo(() => {
    const seen = Array.from(new Set(products.map((p) => p.category_name))).sort();
    return [t("all"), ...seen];
  }, [products, t]);

  const categoryNameToId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (!map.has(p.category_name) && typeof p.category === "number") {
        map.set(p.category_name, p.category);
      }
    }
    return map;
  }, [products]);

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
          1
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

  const handleCategoryClick = (catName: string) => {
    const catId = categoryNameToId.get(catName);
    if (catName === t("all")) {
      router.push("/products");
    } else if (catId) {
      router.push(`/products?category=${catId}`);
    }
  };

  const isActiveCategory = (catName: string) => {
    if (catName === t("all")) return !validCategoryId;
    const catId = categoryNameToId.get(catName);
    return catId === validCategoryId;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div className="container px-4 md:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("catalog")}</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                {t("browseProducts")}
              </p>
              {totalCount > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.rich("showingPage", { page, totalPages, count: totalCount })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  aria-pressed={isActiveCategory(cat)}
                  className="rounded-full"
                  key={slugify(cat)}
                  onClick={() => handleCategoryClick(cat)}
                  size="sm"
                  title={t("filterBy", { category: cat })}
                  variant={isActiveCategory(cat) ? "default" : "outline"}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} onAddToCart={handleAddToCart} product={product} />
            ))}
          </div>

          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-transparent bg-clip-text bg-linear-120 from-white to-black">{tCommon("loading")}</p>
            </div>
          )}

          {products.length === 0 && !isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">{t("noProductsFound")}</p>
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <nav aria-label={t("pagination")} className="mt-12 flex items-center justify-center gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                variant="outline"
              >
                {tCommon("previous")}
              </Button>
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
                      <span key="start-ellipsis" className="px-1 text-muted-foreground">&hellip;</span>
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
                      <span key="end-ellipsis" className="px-1 text-muted-foreground">&hellip;</span>
                    );
                  }
                  pageButtons.push(
                    <Button key={totalPages} onClick={() => handlePageChange(totalPages)} variant="outline" size="sm">
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
                {tCommon("next")}
              </Button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}
