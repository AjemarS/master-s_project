"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "~/ui/primitives/button";
import { Checkbox } from "~/ui/primitives/checkbox";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";
import { CategoryCombobox } from "~/ui/components/category-combobox";
import { FilterCombobox } from "~/ui/components/filter-combobox";
import { PriceRangeSlider } from "~/ui/components/price-range-slider";

interface ProductsFilterSidebarProps {
  priceRange: [number, number];
  priceMin: number;
  priceMax: number;
  onPriceRangeChange: (value: [number, number]) => void;
  categories: { id: number; name: string }[];
  selectedCategoryId: number | null;
  onCategorySelect: (id: number | null) => void;
  brands: string[];
  selectedBrand: string | null;
  onBrandChange: (value: string | null) => void;
  colors: string[];
  selectedColor: string | null;
  onColorChange: (value: string | null) => void;
  onlyInStock: boolean;
  onInStockChange: (value: boolean) => void;
  onSale: boolean;
  onSaleChange: (value: boolean) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;
  onReset: () => void;
  activeFilterCount?: number;
}

export function ProductsFilterSidebar({
  priceRange,
  priceMin,
  priceMax,
  onPriceRangeChange,
  categories,
  selectedCategoryId,
  onCategorySelect,
  brands,
  selectedBrand,
  onBrandChange,
  colors,
  selectedColor,
  onColorChange,
  onlyInStock,
  onInStockChange,
  onSale,
  onSaleChange,
  minRating,
  onMinRatingChange,
  onReset,
  activeFilterCount,
}: ProductsFilterSidebarProps) {
  const t = useTranslations("products");

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">

      {activeFilterCount !== undefined && activeFilterCount > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{t("activeFilters", { count: activeFilterCount })}</span>
          <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        </div>
      )}

      {/* Price Range Slider */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("price")}</h4>
        <PriceRangeSlider
          min={priceMin}
          max={priceMax}
          value={priceRange}
          onChange={onPriceRangeChange}
        />
      </div>

      <Separator />

      {/* Category */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("category")}</h4>
        <CategoryCombobox
          categories={categories}
          value={selectedCategoryId}
          onChange={onCategorySelect}
        />
      </div>

      <Separator />

      {/* Brand */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("brand")}</h4>
        <FilterCombobox
          items={brands}
          value={selectedBrand}
          onChange={onBrandChange}
          searchPlaceholder={t("searchBrand")}
          emptyText={t("noBrandsFound")}
          allLabel={t("allBrands")}
        />
      </div>

      <Separator />

      {/* Color */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("color")}</h4>
        <FilterCombobox
          items={colors}
          value={selectedColor}
          onChange={onColorChange}
          searchPlaceholder={t("searchColor")}
          emptyText={t("noColorsFound")}
          allLabel={t("allColors")}
        />
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={onlyInStock}
            id="in-stock"
            onCheckedChange={(checked) => onInStockChange(checked === true)}
          />
          <Label
            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            htmlFor="in-stock"
          >
            {t("inStock")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={onSale}
            id="on-sale"
            onCheckedChange={(checked) => onSaleChange(checked === true)}
          />
          <Label
            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            htmlFor="on-sale"
          >
            {t("onSale")}
          </Label>
        </div>
      </div>

      <Separator />

      {/* Rating */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("rating")}</h4>
        <div className="flex gap-1.5">
          {[
            { value: 0, label: t("any") },
            { value: 3, label: "3+" },
            { value: 4, label: "4+" },
          ].map((r) => (
            <Button
              className="h-7 px-2.5 text-xs"
              key={r.value}
              onClick={() => onMinRatingChange(r.value)}
              size="sm"
              variant={minRating === r.value ? "default" : "outline"}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Reset */}
      <Button
        className="w-full h-8 text-xs"
        onClick={onReset}
        variant="ghost"
      >
        {t("clearFilters")}
      </Button>
    </div>
  );
}
