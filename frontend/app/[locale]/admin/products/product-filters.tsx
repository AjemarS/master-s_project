"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";

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

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-500">{t("category")}</Label>
              <select
                value={filterCategory}
                onChange={(e) => onFilterChange("filterCategory", e.target.value)}
                className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("allCategories")}</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minPrice" className="text-xs text-slate-500">{t("minPrice")}</Label>
              <Input id="minPrice" type="number" step="0.01" min="0" placeholder={t("pricePlaceholder")}
                value={filterMinPrice} onChange={(e) => onFilterChange("filterMinPrice", e.target.value)} className="w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxPrice" className="text-xs text-slate-500">{t("maxPrice")}</Label>
              <Input id="maxPrice" type="number" step="0.01" min="0" placeholder={t("pricePlaceholder")}
                value={filterMaxPrice} onChange={(e) => onFilterChange("filterMaxPrice", e.target.value)} className="w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-500">{t("minStock")}</Label>
              <Input type="number" min="0" placeholder="0"
                value={filterMinStock} onChange={(e) => onFilterChange("filterMinStock", e.target.value)} className="w-24" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-500">{t("maxStock")}</Label>
              <Input type="number" min="0" placeholder={t("stockPlaceholder")}
                value={filterMaxStock} onChange={(e) => onFilterChange("filterMaxStock", e.target.value)} className="w-24" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-500">{t("dateFrom")}</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => onFilterChange("filterDateFrom", e.target.value)} className="w-36" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-500">{t("dateTo")}</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => onFilterChange("filterDateTo", e.target.value)} className="w-36" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input id="inStock" type="checkbox" checked={filterInStock === true}
                onChange={(e) => onFilterChange("filterInStock", e.target.checked || undefined)}
                className="h-4 w-4 rounded border-gray-300" />
              <Label htmlFor="inStock" className="text-xs text-slate-500 cursor-pointer">{t("onlyInStock")}</Label>
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
