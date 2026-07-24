"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Checkbox } from "~/ui/primitives/checkbox";

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  filterMinPrice: string;
  filterMaxPrice: string;
  filterMinStock: string;
  filterMaxStock: string;
  filterInStock: boolean | undefined;
  filterCategory: string;
  filterDateFrom: string;
  filterDateTo: string;
  categories: { id?: number; name: string }[];
  onFilterChange: (key: string, value: string | boolean | undefined) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

export function ProductFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  filterMinPrice,
  filterMaxPrice,
  filterMinStock,
  filterMaxStock,
  filterInStock,
  filterCategory,
  filterDateFrom,
  filterDateTo,
  categories,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
}: ProductFiltersProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const priceRangeError = filterMinPrice && filterMaxPrice && parseFloat(filterMinPrice) > parseFloat(filterMaxPrice);
  const stockRangeError = filterMinStock && filterMaxStock && parseInt(filterMinStock) > parseInt(filterMaxStock);
  const dateRangeError = filterDateFrom && filterDateTo && filterDateFrom > filterDateTo;

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50 dark:border-border">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("category")}</Label>
              <Select value={filterCategory} onValueChange={(v) => onFilterChange("filterCategory", v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder={t("allCategories")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("allCategories")}</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="minPrice" className="text-xs text-muted-foreground">{t("minPrice")}</Label>
                  <Input id="minPrice" type="number" step="0.01" min="0" placeholder={t("pricePlaceholder")}
                    value={filterMinPrice} onChange={(e) => onFilterChange("filterMinPrice", e.target.value)}
                    className={`w-28 ${priceRangeError ? "border-red-500" : ""}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">{t("maxPrice")}</Label>
                  <Input id="maxPrice" type="number" step="0.01" min="0" placeholder={t("pricePlaceholder")}
                    value={filterMaxPrice} onChange={(e) => onFilterChange("filterMaxPrice", e.target.value)}
                    className={`w-28 ${priceRangeError ? "border-red-500" : ""}`} />
                </div>
              </div>
              {priceRangeError && <p className="text-xs text-red-500">Min price cannot exceed max price</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("minStock")}</Label>
                  <Input type="number" min="0" placeholder="0"
                    value={filterMinStock} onChange={(e) => onFilterChange("filterMinStock", e.target.value)}
                    className={`w-24 ${stockRangeError ? "border-red-500" : ""}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("maxStock")}</Label>
                  <Input type="number" min="0" placeholder={t("stockPlaceholder")}
                    value={filterMaxStock} onChange={(e) => onFilterChange("filterMaxStock", e.target.value)}
                    className={`w-24 ${stockRangeError ? "border-red-500" : ""}`} />
                </div>
              </div>
              {stockRangeError && <p className="text-xs text-red-500">Min stock cannot exceed max stock</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("dateFrom")}</Label>
                  <Input type="date" value={filterDateFrom} onChange={(e) => onFilterChange("filterDateFrom", e.target.value)}
                    className={`w-36 ${dateRangeError ? "border-red-500" : ""}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("dateTo")}</Label>
                  <Input type="date" value={filterDateTo} onChange={(e) => onFilterChange("filterDateTo", e.target.value)}
                    className={`w-36 ${dateRangeError ? "border-red-500" : ""}`} />
                </div>
              </div>
              {dateRangeError && <p className="text-xs text-red-500">Date from cannot be after date to</p>}
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Checkbox id="inStock" checked={filterInStock === true}
                onCheckedChange={(checked) => onFilterChange("filterInStock", checked === true ? true : undefined)} />
              <Label htmlFor="inStock" className="text-xs text-muted-foreground cursor-pointer">{t("onlyInStock")}</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onApplyFilters}>
                {tc("apply")}
              </Button>
              <Button size="sm" variant="outline" onClick={onClearFilters}>
                {tc("reset")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
