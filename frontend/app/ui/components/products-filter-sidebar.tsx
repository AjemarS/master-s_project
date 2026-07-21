"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "~/ui/primitives/button";
import { Checkbox } from "~/ui/primitives/checkbox";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";

interface ProductsFilterSidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  minPrice: string;
  maxPrice: string;
  onPriceChange: (min: string, max: string) => void;
  categories: { id: number; name: string }[];
  selectedCategoryId: number | null;
  onCategorySelect: (id: number | null) => void;
  onlyInStock: boolean;
  onInStockChange: (value: boolean) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;
  sort: string;
  onSortChange: (value: string) => void;
  onReset: () => void;
}

export function ProductsFilterSidebar({
  search,
  onSearchChange,
  minPrice,
  maxPrice,
  onPriceChange,
  categories,
  selectedCategoryId,
  onCategorySelect,
  onlyInStock,
  onInStockChange,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  onReset,
}: ProductsFilterSidebarProps) {
  const t = useTranslations("products");

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          aria-label={t("searchPlaceholder")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          type="search"
          value={search}
        />
      </div>

      <Separator className="my-4" />

      {/* Price */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("price")}</h4>
        <div className="flex items-center gap-2">
          <input
            aria-label={t("minPrice")}
            className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => {
              onPriceChange(e.target.value, maxPrice);
            }}
            placeholder={t("minPrice")}
            type="number"
            value={minPrice}
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            aria-label={t("maxPrice")}
            className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => {
              onPriceChange(minPrice, e.target.value);
            }}
            placeholder={t("maxPrice")}
            type="number"
            value={maxPrice}
          />
        </div>
      </div>

      <Separator className="my-4" />

      {/* Category */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("category")}</h4>
        <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedCategoryId === null}
              id="cat-all"
              onCheckedChange={() => onCategorySelect(null)}
            />
            <Label
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              htmlFor="cat-all"
            >
              {t("all")}
            </Label>
          </div>
          {categories.map((cat) => (
            <div className="flex items-center gap-2" key={cat.id}>
              <Checkbox
                checked={selectedCategoryId === cat.id}
                id={`cat-${cat.id}`}
                onCheckedChange={(checked) => {
                  onCategorySelect(checked ? cat.id : null);
                }}
              />
              <Label
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                htmlFor={`cat-${cat.id}`}
              >
                {cat.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* In stock */}
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

      <Separator className="my-4" />

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

      <Separator className="my-4" />

      {/* Sort */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("sortBy")}</h4>
        <Select onValueChange={onSortChange} value={sort}>
          <SelectTrigger className="h-8 text-xs">
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

      <Separator className="my-4" />

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
