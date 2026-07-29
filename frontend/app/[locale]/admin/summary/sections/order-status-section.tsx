"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useOrders } from "~/lib/hooks/use-api-data";
import { OrderStatusCard } from "../dashboard";

export function OrderStatusSection() {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");

  const { data: ordersData, isLoading } = useOrders(undefined, {
    refreshInterval: 15000,
  });

  const statusCounts = useMemo(() => {
    if (!ordersData?.results) return [];
    const counts: Record<string, number> = {};
    for (const order of ordersData.results) {
      counts[order.status] = (counts[order.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [ordersData]);

  return (
    <div className="mb-8">
      <OrderStatusCard
        statusCounts={statusCounts}
        isLoading={isLoading}
        tSum={tSum}
        tc={tc}
      />
    </div>
  );
}
