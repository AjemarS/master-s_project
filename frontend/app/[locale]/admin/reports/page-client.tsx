"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, SalesGroup, SalesSeries, TopProductsSort } from "~/lib/types";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { ReportDateFilter, lastDays } from "./report-date-filter";
import { ReportStatCards } from "./report-stat-cards";
import { ReportCharts } from "./report-charts";
import { TopProductsTable } from "./top-products-table";
import { AbcAnalysis } from "./abc-analysis";
import { StockHealth } from "./stock-health";
import { Fulfillment } from "./fulfillment";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/ui/primitives/tabs";

type ReportTab = "sales" | "abc" | "fulfillment" | "stock";

export function ReportsClient() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();

  // A closed range by default, so every KPI can be compared with the previous period
  const [dateInput, setDateInput] = useState(() => lastDays(30));
  const [appliedFilter, setAppliedFilter] = useState(dateInput);
  const [group, setGroup] = useState<SalesGroup>("day");
  const [topSort, setTopSort] = useState<TopProductsSort>("revenue");
  const [tab, setTab] = useState<ReportTab>("sales");

  const dateRangeError = !!(dateInput.from && dateInput.to && dateInput.from > dateInput.to);

  const handleApplyFilter = () => {
    if (dateRangeError) {
      toast.error(t("dateRangeError"));
      return;
    }
    setAppliedFilter({ from: dateInput.from, to: dateInput.to });
  };

  const handlePreset = (range: { from: string; to: string }) => {
    setDateInput(range);
    setAppliedFilter(range);
  };

  const handleResetFilter = () => handlePreset(lastDays(30));

  const handleDateChange = (field: "from" | "to", value: string) => {
    setDateInput((prev) => ({ ...prev, [field]: value }));
  };

  const range = { from: appliedFilter.from || undefined, to: appliedFilter.to || undefined };
  const filterKey = `${appliedFilter.from}|${appliedFilter.to}`;
  // Sales requests only while their tab is open (a null key pauses SWR)
  const onSales = tab === "sales";

  const { data: sales, error: salesErr, isLoading: salesLoading } = useApiGet<SalesReport>(
    onSales ? `/reports/sales?${filterKey}` : null,
    () => reportApi.sales(range.from, range.to)
  );

  const { data: inventoryValue, error: invErr, isLoading: invLoading } = useApiGet<{ total_value: number; item_count: number }>(
    onSales ? "/reports/inventory-value" : null,
    () => reportApi.inventoryValue()
  );

  const { data: series, error: seriesErr, isLoading: seriesLoading } = useApiGet<SalesSeries>(
    onSales ? `/reports/daily-sales?${filterKey}|${group}` : null,
    () => reportApi.dailySales({ ...range, group })
  );

  const { data: top, error: topErr, isLoading: topLoading } = useApiGet(
    onSales ? `/reports/top-products?${filterKey}|${topSort}` : null,
    () => reportApi.topProducts({ ...range, sort: topSort, limit: 10 })
  );

  const loading = salesLoading || invLoading;
  const error = salesErr || invErr || seriesErr || topErr || null;

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={BarChart3}
          backLabel={tc("back")}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">{t("tabSales")}</TabsTrigger>
            <TabsTrigger value="abc">{t("tabAbc")}</TabsTrigger>
            <TabsTrigger value="fulfillment">{t("tabFulfillment")}</TabsTrigger>
            <TabsTrigger value="stock">{t("tabStock")}</TabsTrigger>
          </TabsList>

          {/* Stock health has its own look-back window; the date range drives sales and ABC */}
          {tab !== "stock" && (
            <ReportDateFilter
              dateInput={dateInput}
              dateRangeError={dateRangeError}
              onDateChange={handleDateChange}
              onApply={handleApplyFilter}
              onReset={handleResetFilter}
              onPreset={handlePreset}
            />
          )}

          <TabsContent value="sales" className="space-y-6">
            <ErrorAlert message={error?.message || null} />
            {loading ? (
              <StatsGridSkeleton count={8} />
            ) : (
              <ReportStatCards sales={sales} inventoryValue={inventoryValue} />
            )}
            <ReportCharts
              series={series?.daily ?? []}
              group={group}
              onGroupChange={setGroup}
              loading={seriesLoading}
              sales={sales}
              locale={locale}
            />
            <TopProductsTable
              products={top?.products ?? []}
              sort={topSort}
              onSortChange={setTopSort}
              loading={topLoading}
            />
          </TabsContent>

          <TabsContent value="abc">
            <AbcAnalysis from={range.from} to={range.to} />
          </TabsContent>

          <TabsContent value="fulfillment">
            <Fulfillment from={range.from} to={range.to} />
          </TabsContent>

          <TabsContent value="stock">
            <StockHealth />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
