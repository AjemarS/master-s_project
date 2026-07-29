"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useApiGet } from "~/lib/hooks/use-api";
import { useWarehouses, useStock } from "~/lib/hooks/use-api-data";
import { reportApi } from "~/lib/api/admin-api";
import type { SalesReport } from "~/lib/types";
import {
  ChannelPieChart,
  WarehouseOccupancyCard,
  SystemHealthCard,
} from "../dashboard";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];
const refreshInterval = 15000;

export function RevenueCharts() {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");

  const { data: salesData } = useApiGet<SalesReport>("/sales", () =>
    reportApi.sales(),
    { refreshInterval },
  );
  const { data: warehousesData } = useWarehouses(undefined, {
    refreshInterval,
  });
  const { data: stockData } = useStock(undefined, {
    refreshInterval,
  });

  const warehouseOccupancy = useMemo(() => {
    const whs = warehousesData?.results ?? [];
    const st = stockData ?? [];
    if (!whs.length || !st.length) return [];
    return whs.map((wh) => {
      const whStock = st.filter((s) => s.warehouse_name === wh.name);
      return {
        name: wh.name,
        items: whStock.length,
        quantity: whStock.reduce((s, stk) => s + stk.quantity, 0),
      };
    });
  }, [warehousesData, stockData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <ChannelPieChart
        data={salesData?.by_channel}
        colors={COLORS}
        onlineLabel={tc("online")}
        offlineLabel={tc("offline")}
        tSum={tSum}
      />
      <WarehouseOccupancyCard data={warehouseOccupancy} tSum={tSum} />
      <SystemHealthCard tSum={tSum} />
    </div>
  );
}
