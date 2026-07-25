"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { ArrowRightLeft, Filter, X, Pencil } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useStockMovements, useWarehouses } from "~/lib/hooks/use-api-data";
import { ErrorAlert } from "~/ui/components/error-alert";
import { Pagination } from "~/ui/components/pagination";
import { StockMovementFilters } from "./stock-movement-filters";
import { StockMovementTable } from "./stock-movement-table";
import { StockAdjustDialog } from "./stock-adjust-dialog";

export function StockMovementsClient() {
  const tSM = useTranslations("stockMovements");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const MOVEMENT_TYPES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    receipt: { label: tSM("receipt"), variant: "default" },
    transfer: { label: tSM("transfer"), variant: "secondary" },
    sale: { label: tSM("sale"), variant: "outline" },
    adjustment: { label: tSM("adjustment"), variant: "outline" },
    write_off: { label: tSM("write_off"), variant: "destructive" },
    reserve: { label: tSM("reserve"), variant: "outline" },
    release: { label: tSM("release"), variant: "outline" },
    deduct: { label: tSM("deduct"), variant: "default" },
  };

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterFromWarehouse, setFilterFromWarehouse] = useState("");
  const [filterToWarehouse, setFilterToWarehouse] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);

  const params: Record<string, string | number | undefined> = { page };
  if (filterType) params.type = filterType;
  if (filterProductId) params.product_id = parseInt(filterProductId, 10);
  if (filterFromWarehouse) params.from_warehouse_id = parseInt(filterFromWarehouse, 10);
  if (filterToWarehouse) params.to_warehouse_id = parseInt(filterToWarehouse, 10);
  if (filterDateFrom) params.created_after = filterDateFrom;
  if (filterDateTo) params.created_before = filterDateTo;

  const { data: movementsData, error: movementsError, isLoading: movementsLoading, mutate: movementsMutate } = useStockMovements(params);
  const { data: warehousesData } = useWarehouses();

  const movements = useMemo(() => movementsData?.results || [], [movementsData?.results]);
  const warehouses = useMemo(() => warehousesData?.results || [], [warehousesData?.results]);
  const totalCount = movementsData?.count || 0;

  const dateRangeError = !!(filterDateFrom && filterDateTo && filterDateFrom > filterDateTo);

  const handleApplyFilters = () => setPage(1);

  const handleResetFilters = () => {
    setFilterType("");
    setFilterProductId("");
    setFilterFromWarehouse("");
    setFilterToWarehouse("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={tSM("title")}
          subtitle={tSM("subtitle")}
          icon={ArrowRightLeft}
          backLabel={tCommon("back")}
          actions={
            <Button className="flex items-center gap-2" onClick={() => setAdjustOpen(true)}>
              <Pencil className="h-4 w-4" /> {tSM("adjustStockTitle")}
            </Button>
          }
        />

        <ErrorAlert message={movementsError?.message || null} />

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">{tSM("title")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {totalCount > 0 ? tCommon("count", { count: totalCount }) : tSM("noMovements")}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                {showFilters ? tCommon("close") : tCommon("filter")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <StockMovementFilters
              showFilters={showFilters}
              filterType={filterType}
              filterProductId={filterProductId}
              filterFromWarehouse={filterFromWarehouse}
              filterToWarehouse={filterToWarehouse}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              warehouses={warehouses}
              movementTypes={MOVEMENT_TYPES}
              dateRangeError={dateRangeError}
              onFilterTypeChange={setFilterType}
              onFilterProductIdChange={setFilterProductId}
              onFilterFromWarehouseChange={setFilterFromWarehouse}
              onFilterToWarehouseChange={setFilterToWarehouse}
              onFilterDateFromChange={setFilterDateFrom}
              onFilterDateToChange={setFilterDateTo}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />

            <StockMovementTable
              movements={movements}
              isLoading={movementsLoading}
              movementTypes={MOVEMENT_TYPES}
              formatDate={formatDate}
            />
          </CardContent>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / 20)}
          loading={movementsLoading}
          onPageChange={setPage}
        />

        <StockAdjustDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onSuccess={() => movementsMutate()}
        />
      </div>
    </div>
  );
}
