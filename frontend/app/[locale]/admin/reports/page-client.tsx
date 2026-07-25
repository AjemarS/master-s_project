"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useApiGet } from "~/lib/hooks/use-api";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport, RevenueReport } from "~/lib/types";
import { StatsGridSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { ReportDateFilter } from "./report-date-filter";
import { ReportStatCards } from "./report-stat-cards";
import { ReportCharts } from "./report-charts";

export function ReportsClient() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [dateInput, setDateInput] = useState({ from: "", to: "" });
  const [appliedFilter, setAppliedFilter] = useState({ from: "", to: "" });

  const dateRangeError = !!(dateInput.from && dateInput.to && dateInput.from > dateInput.to);

  const handleApplyFilter = () => {
    if (dateRangeError) {
      toast.error("Date from cannot be after date to");
      return;
    }
    setAppliedFilter({ from: dateInput.from, to: dateInput.to });
  };

  const handleResetFilter = () => {
    setDateInput({ from: "", to: "" });
    setAppliedFilter({ from: "", to: "" });
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    setDateInput((prev) => ({ ...prev, [field]: value }));
  };

  const filterKey = `${appliedFilter.from}|${appliedFilter.to}`;

  const { data: sales, error: salesErr, isLoading: salesLoading } = useApiGet<SalesReport>(
    `/reports/sales?${filterKey}`,
    () => reportApi.sales(appliedFilter.from || undefined, appliedFilter.to || undefined)
  );

  const { data: revenue, error: revErr, isLoading: revLoading } = useApiGet<RevenueReport>(
    `/reports/revenue?${filterKey}`,
    () => reportApi.revenue(appliedFilter.from || undefined, appliedFilter.to || undefined)
  );

  const { data: inventoryValue, error: invErr, isLoading: invLoading } = useApiGet<{ total_value: string; item_count: number }>(
    "/reports/inventory-value",
    () => reportApi.inventoryValue()
  );

  const { data: dailySales, error: dailyErr, isLoading: dailyLoading } = useApiGet<{ daily: { date: string; revenue: number; orders: number }[] }>(
    "/reports/daily-sales",
    () => reportApi.dailySales()
  );

  const loading = salesLoading || revLoading || invLoading || dailyLoading;
  const error = salesErr || revErr || invErr || dailyErr || null;

  const dailySalesData = dailySales?.daily ?? [];

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={BarChart3}
          backLabel={tc("back")}
        />

        <ErrorAlert message={error?.message || null} />

        {loading ? (
          <StatsGridSkeleton count={6} />
        ) : (
          <div className="space-y-6">
            <ReportDateFilter
              dateInput={dateInput}
              dateRangeError={dateRangeError}
              onDateChange={handleDateChange}
              onApply={handleApplyFilter}
              onReset={handleResetFilter}
            />
            <ReportStatCards
              sales={sales}
              revenue={revenue}
              inventoryValue={inventoryValue}
            />
            <ReportCharts
              dailySalesData={dailySalesData}
              sales={sales}
              locale={locale}
              COLORS={COLORS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
