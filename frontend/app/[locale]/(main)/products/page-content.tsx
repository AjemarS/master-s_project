"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { useTranslations } from "next-intl";
import { ProductCard } from "~/ui/components/product-card";
import { ProductsFilterSidebar } from "~/ui/components/products-filter-sidebar";
import { categoryApi, productApi } from "~/lib/api/admin-api";
import { useCart } from "~/lib/hooks/use-cart";
import { getImageUrl } from "~/lib/utils/image-url";
import { Pagination } from "~/ui/components/pagination";
import type { ApiResult } from "~/lib/types";
import type { Category, Product } from "~/lib/types";

const orderingMap = {
  newest: "-created_at",
  price_asc: "price",
  price_desc: "-price",
  rating: "-rating",
  name: "name",
} as const;

type SortKey = keyof typeof orderingMap;

function toItem(product: Product) {
  return {
    category: product.category_name,
    id: String(product.id),
    slug: product.slug,
    image: getImageUrl(product.image_url),
    name: product.name,
    price: Number(product.price),
  };
}

export default function ProductsPageContent() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [onlyInStock, setOnlyInStock] = React.useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | null>(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      const catId = parseInt(catParam, 10);
      if (!isNaN(catId)) return catId;
    }
    return null;
  });
  const [sort, setSort] = React.useState<string>("newest");
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([]);
  const [minRating, setMinRating] = React.useState(0);

  React.useEffect(() => {
    categoryApi.getAll().then((res: ApiResult<{ results: Category[]; count: number }>) => {
      if (res.data) {
        setCategories(
          res.data.results
            .filter((c): c is Category & { id: number } => c.id !== undefined)
            .map((c) => ({ id: c.id, name: c.name })),
        );
      }
    });
  }, []);

  const getFilters = React.useCallback(() => {
    const filters: Record<string, string | number | boolean | undefined> = {
      page,
      pageSize: 12,
      ordering: orderingMap[sort as SortKey] ?? orderingMap.newest,
    };
    if (search.trim()) filters.search = search.trim();
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (onlyInStock) filters.inStock = true;
    if (selectedCategoryId !== null) filters.category = selectedCategoryId;
    if (minRating > 0) filters.minRating = minRating;
    return filters;
  }, [page, sort, search, minPrice, maxPrice, onlyInStock, selectedCategoryId, minRating]);

  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await productApi.getAll(getFilters());
      if (response.data) {
        setProducts(response.data.results);
        setTotalCount(response.data.count);
        setTotalPages(Math.ceil(response.data.count / 12));
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [getFilters]);

  React.useEffect(() => {
    const timer = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  const handleAddToCart = React.useCallback(
    async (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      try {
        await addItem(toItem(product), 1);
      } catch {
        // silent
      }
    },
    [addItem, products],
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setPage(newPage);
    },
    [totalPages],
  );

  const handlePriceChange = React.useCallback((min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
  }, []);

  return (
    <div className="container px-4 md:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-[260px] lg:shrink-0">
          <ProductsFilterSidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={setSelectedCategoryId}
            search={search}
            onSearchChange={setSearch}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={handlePriceChange}
            onlyInStock={onlyInStock}
            onInStockChange={setOnlyInStock}
            sort={sort}
            onSortChange={setSort}
            minRating={minRating}
            onMinRatingChange={setMinRating}
            onReset={() => {
              setSearch("");
              setMinPrice("");
              setMaxPrice("");
              setOnlyInStock(false);
              setSelectedCategoryId(null);
              setSort("newest");
              setMinRating(0);
              setPage(1);
            }}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("catalog")}</h1>
              {totalCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCount} {t("productCount")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} onAddToCart={handleAddToCart} product={product} />
            ))}
          </div>

          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground animate-pulse">{tCommon("loading")}</p>
            </div>
          )}

          {products.length === 0 && !isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">{t("noProductsFound")}</p>
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center">
              <Pagination
                currentPage={page}
                onPageChange={handlePageChange}
                totalPages={totalPages}
                totalCount={totalCount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
