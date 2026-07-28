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
import type { Category, Product } from "~/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";
import { Button } from "~/ui/primitives/button";
import { Sheet, SheetContent, SheetTrigger } from "~/ui/primitives/sheet";
import { SlidersHorizontal } from "lucide-react";

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

  // Price range: slider value and axis limits
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 100000]);
  const [priceMin, setPriceMin] = React.useState(0);
  const [priceMax, setPriceMax] = React.useState(100000);

  // Brand & color
  const [brands, setBrands] = React.useState<string[]>([]);
  const [colors, setColors] = React.useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);

  const [onlyInStock, setOnlyInStock] = React.useState(false);
  const [onSale, setOnSale] = React.useState(false);
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
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [searchTerm] = React.useState<string>(() => {
    return searchParams.get("search") || "";
  });

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (priceRange[0] > priceMin || priceRange[1] < priceMax) count++;
    if (selectedCategoryId !== null) count++;
    if (selectedBrand) count++;
    if (selectedColor) count++;
    if (onlyInStock) count++;
    if (onSale) count++;
    if (minRating > 0) count++;
    if (searchTerm) count++;
    return count;
  }, [priceRange, priceMin, priceMax, selectedCategoryId, selectedBrand, selectedColor, onlyInStock, onSale, minRating, searchTerm]);

  const PAGE_SIZE = 20;

  // Fetch categories, brands, colors and price bounds on mount
  React.useEffect(() => {
    async function loadFilterOptions() {
      const [catRes, productRes] = await Promise.all([
        categoryApi.getAll(),
        productApi.getAll({ pageSize: 100 }),
      ]);
      if (catRes.data) {
        setCategories(
          catRes.data.results
            .filter((c): c is Category & { id: number } => c.id !== undefined)
            .map((c) => ({ id: c.id, name: c.name })),
        );
      }
      if (productRes.data?.results) {
        const allProducts = productRes.data.results;
        const uniqueBrands = [...new Set(allProducts.map((p: Product) => p.brand).filter(Boolean))] as string[];
        const uniqueColors = [...new Set(allProducts.map((p: Product) => p.color).filter(Boolean))] as string[];
        uniqueBrands.sort();
        uniqueColors.sort();
        setBrands(uniqueBrands);
        setColors(uniqueColors);

        // Set price bounds from actual data
        const prices = allProducts.map((p: Product) => Number(p.price));
        const minP = Math.floor(Math.min(...prices));
        const maxP = Math.ceil(Math.max(...prices));
        setPriceMin(minP);
        setPriceMax(maxP);
        setPriceRange([minP, maxP]);
      }
    }
    loadFilterOptions();
  }, []);

  const getFilters = React.useCallback(() => {
    const filters: Record<string, string | number | boolean | undefined> = {
      page,
      pageSize: PAGE_SIZE,
      ordering: orderingMap[sort as SortKey] ?? orderingMap.newest,
    };
    if (priceRange[0] > priceMin) filters.minPrice = priceRange[0];
    if (priceRange[1] < priceMax) filters.maxPrice = priceRange[1];
    if (onlyInStock) filters.inStock = true;
    if (onSale) filters.onSale = true;
    if (selectedCategoryId !== null) filters.category = selectedCategoryId;
    if (selectedBrand) filters.brand = selectedBrand;
    if (selectedColor) filters.color = selectedColor;
    if (minRating > 0) filters.minRating = minRating;
    if (searchTerm) filters.search = searchTerm;
    return filters;
  }, [page, sort, priceRange, priceMin, priceMax, onlyInStock, onSale, selectedCategoryId, selectedBrand, selectedColor, minRating, searchTerm]);

  React.useEffect(() => {
    let cancelled = false;

    productApi.getAll(getFilters())
      .then((response) => {
        if (!cancelled && response.data) {
          setProducts(response.data.results);
          setTotalCount(response.data.count);
          setTotalPages(Math.ceil(response.data.count / PAGE_SIZE));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getFilters]);

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

  const filterProps = {
    priceRange, priceMin, priceMax,
    onPriceRangeChange: (val: [number, number]) => { setPriceRange(val); setPage(1); },
    categories, selectedCategoryId,
    onCategorySelect: (id: number | null) => { setSelectedCategoryId(id); setPage(1); },
    brands, selectedBrand,
    onBrandChange: (val: string | null) => { setSelectedBrand(val); setPage(1); },
    colors, selectedColor,
    onColorChange: (val: string | null) => { setSelectedColor(val); setPage(1); },
    onlyInStock,
    onInStockChange: (val: boolean) => { setOnlyInStock(val); setPage(1); },
    onSale,
    onSaleChange: (val: boolean) => { setOnSale(val); setPage(1); },
    minRating,
    onMinRatingChange: (val: number) => { setMinRating(val); setPage(1); },
    activeFilterCount,
    onReset: () => {
      setPriceRange([priceMin, priceMax]);
      setOnlyInStock(false);
      setOnSale(false);
      setSelectedCategoryId(null);
      setSelectedBrand(null);
      setSelectedColor(null);
      setSort("newest");
      setMinRating(0);
      setPage(1);
    },
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block lg:w-[240px] lg:shrink-0 lg:sticky lg:top-24 lg:h-fit">
          <ProductsFilterSidebar
            {...filterProps}
          />
        </aside>

        {/* Mobile filter trigger + sheet */}
        <div className="lg:hidden mb-4">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t("filters")}
                {activeFilterCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto p-0">
              <div className="p-5">
                <ProductsFilterSidebar
                  {...filterProps}
                  onReset={() => {
                    filterProps.onReset();
                    setFilterOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 lg:min-w-[70vw]">
          {/* Top bar: sort */}
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("sortBy")}</span>
              <Select onValueChange={(val) => { setSort(val); setPage(1); }} value={sort}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("sortNewest")}</SelectItem>
                  <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
                  <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
                  <SelectItem value="rating">{t("sortRating")}</SelectItem>
                  <SelectItem value="name">{t("sortName")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {searchTerm && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("searchResultsFor")} &ldquo;{searchTerm}&rdquo;
              </h2>
              <p className="text-sm text-muted-foreground">
                {tCommon("found", { count: totalCount })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <div className="mt-8 flex items-center justify-center">
              <Pagination
                currentPage={page}
                onPageChange={handlePageChange}
                totalPages={totalPages}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
