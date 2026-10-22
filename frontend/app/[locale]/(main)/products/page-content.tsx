"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { usePathname, useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { ProductCard } from "~/ui/components/product-card";
import { ProductsFilterSidebar } from "~/ui/components/products-filter-sidebar";
import { useCart } from "~/lib/hooks/use-cart";
import { useCategories, useProducts } from "~/lib/hooks/use-api-data";
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
  const router = useRouter();
  const pathname = usePathname();
  const { addItem } = useCart();

  // Price slider axis limits, seeded from the catalogue
  const [priceMin, setPriceMin] = React.useState(0);
  const [priceMax, setPriceMax] = React.useState(100000);
  const [filterOpen, setFilterOpen] = React.useState(false);

  // Filters, sort and page live in the URL: Back works, links are shareable
  const numParam = (key: string) => {
    const n = Number(searchParams.get(key) ?? "");
    return searchParams.has(key) && Number.isFinite(n) ? n : null;
  };
  const page = Math.max(1, numParam("page") ?? 1);
  const selectedCategoryId = numParam("category");
  const selectedBrand = searchParams.get("brand");
  const selectedColor = searchParams.get("color");
  const onlyInStock = searchParams.get("inStock") === "1";
  const onSale = searchParams.get("sale") === "1";
  const minRating = numParam("rating") ?? 0;
  const sortParam = searchParams.get("sort") ?? "";
  const sort: SortKey = sortParam in orderingMap ? (sortParam as SortKey) : "newest";
  const searchTerm = searchParams.get("search") ?? "";
  const minPriceParam = numParam("minPrice");
  const maxPriceParam = numParam("maxPrice");
  const priceRange = React.useMemo<[number, number]>(
    () => [minPriceParam ?? priceMin, maxPriceParam ?? priceMax],
    [minPriceParam, maxPriceParam, priceMin, priceMax],
  );

  // null removes a param; any filter change except paging goes back to page 1
  const setParams = (updates: Record<string, string | number | null>, history: "push" | "replace" = "push") => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, String(value));
    }
    if (!("page" in updates)) next.delete("page");
    const qs = next.toString();
    router[history](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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

  // Filter option data: categories, brands, colors and price bounds
  const { data: categoriesData } = useCategories();
  const { data: allProductsData } = useProducts({ pageSize: 100 });
  const priceInitializedRef = React.useRef(false);

  const categories = React.useMemo(
    () =>
      (categoriesData?.results ?? [])
        .filter((c): c is Category & { id: number } => c.id !== undefined)
        .map((c) => ({ id: c.id, name: c.name })),
    [categoriesData],
  );

  const { brands, colors } = React.useMemo(() => {
    const allProducts = allProductsData?.results ?? [];
    const uniqueBrands = [...new Set(allProducts.map((p: Product) => p.brand).filter(Boolean))] as string[];
    const uniqueColors = [...new Set(allProducts.map((p: Product) => p.color).filter(Boolean))] as string[];
    uniqueBrands.sort();
    uniqueColors.sort();
    return { brands: uniqueBrands, colors: uniqueColors };
  }, [allProductsData]);

  // Initialize price bounds from actual data once, without clobbering user slider selections
  React.useEffect(() => {
    if (priceInitializedRef.current) return;
    const allProducts = allProductsData?.results;
    if (!allProducts || allProducts.length === 0) return;
    const prices = allProducts.map((p: Product) => Number(p.price));
    const minP = Math.floor(Math.min(...prices));
    const maxP = Math.ceil(Math.max(...prices));
    /* eslint-disable react-hooks/set-state-in-effect -- intentional: seed slider bounds once from first data arrival (ref-guarded) */
    setPriceMin(minP);
    setPriceMax(maxP);
    /* eslint-enable react-hooks/set-state-in-effect */
    priceInitializedRef.current = true;
  }, [allProductsData]);

  const getFilters = React.useCallback(() => {
    const filters: Record<string, string | number | boolean | undefined> = {
      page,
      pageSize: PAGE_SIZE,
      ordering: orderingMap[sort],
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

  const { data: productData, isLoading } = useProducts(getFilters());
  const showInitialLoading = isLoading && !productData;
  const products = React.useMemo(() => productData?.results ?? [], [productData]);
  const totalCount = productData?.count ?? 0;
  const totalPages = Math.ceil((productData?.count ?? 0) / PAGE_SIZE);

  const handleAddToCart = React.useCallback(
    async (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return false;
      return addItem(toItem(product), 1);
    },
    [addItem, products],
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setParams({ page: newPage === 1 ? null : newPage });
  };

  const filterProps = {
    priceRange, priceMin, priceMax,
    // The slider fires while dragging: replace, so Back does not step through every position
    onPriceRangeChange: (val: [number, number]) =>
      setParams({ minPrice: val[0] > priceMin ? val[0] : null, maxPrice: val[1] < priceMax ? val[1] : null }, "replace"),
    categories, selectedCategoryId,
    onCategorySelect: (id: number | null) => setParams({ category: id }),
    brands, selectedBrand,
    onBrandChange: (val: string | null) => setParams({ brand: val }),
    colors, selectedColor,
    onColorChange: (val: string | null) => setParams({ color: val }),
    onlyInStock,
    onInStockChange: (val: boolean) => setParams({ inStock: val ? 1 : null }),
    onSale,
    onSaleChange: (val: boolean) => setParams({ sale: val ? 1 : null }),
    minRating,
    onMinRatingChange: (val: number) => setParams({ rating: val > 0 ? val : null }),
    activeFilterCount,
    // Keeps ?search=, as before
    onReset: () =>
      setParams({ minPrice: null, maxPrice: null, inStock: null, sale: null, category: null, brand: null, color: null, sort: null, rating: null }),
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
          {/* Top bar: page heading + sort */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{t("catalog")}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("sortBy")}</span>
              <Select onValueChange={(val) => setParams({ sort: val === "newest" ? null : val })} value={sort}>
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} onAddToCart={handleAddToCart} product={product} />
            ))}
          </div>

          {showInitialLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground animate-pulse">{tCommon("loading")}</p>
            </div>
          )}

          {products.length === 0 && !isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">{t("noProductsFound")}</p>
            </div>
          )}

          {!showInitialLoading && totalPages > 1 && (
            <div className="mt-2 flex items-center justify-center">
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
