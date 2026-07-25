"use client";

import { useTranslations } from "next-intl";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Button } from "~/ui/primitives/button";
import type { Warehouse } from "~/lib/types";

interface StockMovementFiltersProps {
  showFilters: boolean;
  filterType: string;
  filterProductId: string;
  filterFromWarehouse: string;
  filterToWarehouse: string;
  filterDateFrom: string;
  filterDateTo: string;
  warehouses: Warehouse[];
  movementTypes: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  dateRangeError: boolean;
  onFilterTypeChange: (value: string) => void;
  onFilterProductIdChange: (value: string) => void;
  onFilterFromWarehouseChange: (value: string) => void;
  onFilterToWarehouseChange: (value: string) => void;
  onFilterDateFromChange: (value: string) => void;
  onFilterDateToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function StockMovementFilters({
  showFilters,
  filterType,
  filterProductId,
  filterFromWarehouse,
  filterToWarehouse,
  filterDateFrom,
  filterDateTo,
  warehouses,
  movementTypes,
  dateRangeError,
  onFilterTypeChange,
  onFilterProductIdChange,
  onFilterFromWarehouseChange,
  onFilterToWarehouseChange,
  onFilterDateFromChange,
  onFilterDateToChange,
  onApply,
  onReset,
}: StockMovementFiltersProps) {
  const tSM = useTranslations("stockMovements");
  const tCommon = useTranslations("common");

  if (!showFilters) return null;

  return (
    <div className="mb-6 p-4 border rounded-lg bg-muted/50 dark:border-border">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{tSM("type")}</Label>
          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger className="w-44"><SelectValue placeholder={tSM("allTypes")} /></SelectTrigger>
            <SelectContent>
              {Object.entries(movementTypes).map(([val, info]) => (
                <SelectItem key={val} value={val}>{info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{tSM("productId")}</Label>
          <Input type="number" placeholder="ID" value={filterProductId} onChange={(e) => onFilterProductIdChange(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{tSM("from")}</Label>
          <Select value={filterFromWarehouse} onValueChange={onFilterFromWarehouseChange}>
            <SelectTrigger className="w-44"><SelectValue placeholder={tSM("all")} /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{tSM("to")}</Label>
          <Select value={filterToWarehouse} onValueChange={onFilterToWarehouseChange}>
            <SelectTrigger className="w-44"><SelectValue placeholder={tSM("all")} /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tCommon("dateFrom")}</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => onFilterDateFromChange(e.target.value)}
                className={`w-40 ${dateRangeError ? "border-red-500" : ""}`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{tCommon("dateTo")}</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => onFilterDateToChange(e.target.value)}
                className={`w-40 ${dateRangeError ? "border-red-500" : ""}`} />
            </div>
          </div>
          {dateRangeError && <p className="text-xs text-red-500">Date from cannot be after date to</p>}
        </div>
        <Button size="sm" onClick={onApply}>{tCommon("apply")}</Button>
        <Button size="sm" variant="outline" onClick={onReset}>{tCommon("reset")}</Button>
      </div>
    </div>
  );
}
