"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "~/lib/types";
import { useOrders, useLowStock } from "~/lib/hooks/use-api-data";
import { formatCurrency } from "~/lib/utils/format";
import {
  RecentOrdersCard,
  LowStockCard,
} from "../dashboard";

interface OrdersPanelProps {
  initialProducts: Product[];
}

const recentOrdersCount = 10;
const refreshInterval = 15000;

export function OrdersPanel({ initialProducts }: OrdersPanelProps) {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");

  const { data: ordersData, isLoading: ordersLoading } = useOrders(undefined, {
    refreshInterval,
  });
  const { data: lowStockData, isLoading: lowStockLoading } = useLowStock(10, {
    refreshInterval,
  });

  const recentOrders = useMemo(
    () => ordersData?.results?.slice(0, recentOrdersCount) || [],
    [ordersData],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <RecentOrdersCard
        orders={recentOrders}
        isLoading={ordersLoading}
        tSum={tSum}
        tc={tc}
        formatCurrency={formatCurrency}
      />
      <LowStockCard
        lowStockData={lowStockData}
        initialProducts={initialProducts}
        tSum={tSum}
      />
    </div>
  );
}
