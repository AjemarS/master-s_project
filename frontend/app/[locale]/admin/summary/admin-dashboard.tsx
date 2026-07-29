"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Product } from "~/lib/types";
import { DashboardHeader } from "./dashboard";
import { LastUpdated } from "../components";
import { DashboardStats, OrdersPanel, RevenueCharts, AdminExtra, OrderStatusSection, RecentProductsSection } from "./sections";
import { NavSection } from "./dashboard";
import {
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  CreditCard,
  Truck,
  ClipboardList,
  BarChart3,
} from "lucide-react";

interface AdminDashboardProps {
  initialProducts: Product[];
}

const NAV_ITEMS = [
  { key: "products", href: "/admin/products", icon: Package, color: "text-[var(--chart-1)]" },
  { key: "orders", href: "/admin/orders", icon: ShoppingCart, color: "text-primary" },
  { key: "pos", href: "/admin/pos", icon: CreditCard, color: "text-[var(--chart-2)]" },
  { key: "warehouses", href: "/admin/warehouses", icon: Warehouse, color: "text-[var(--chart-3)]" },
  { key: "suppliers", href: "/admin/suppliers", icon: Truck, color: "text-[var(--chart-4)]" },
  { key: "goodsReceipts", href: "/admin/goods-receipts", icon: ClipboardList, color: "text-[var(--chart-5)]" },
  { key: "reports", href: "/admin/reports", icon: BarChart3, color: "text-[var(--chart-1)]" },
  { key: "users", href: "/admin/users", icon: Users, color: "text-[var(--chart-2)]" },
];

export function AdminDashboard({ initialProducts }: AdminDashboardProps) {
  const tSum = useTranslations("summary");
  const tNav = useTranslations("nav");

  const lastUpdated = useMemo(() => new Date(), []);

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader tSum={tSum} />

        <div className="mb-4">
          <LastUpdated timestamp={lastUpdated} loading={false} />
        </div>

        {/* Stats row — fetches its own data */}
        <DashboardStats initialProducts={initialProducts} />

        {/* Nav section — static, no data fetching */}
        <NavSection items={NAV_ITEMS} tNav={tNav} tSum={tSum} />

        {/* Orders + Low stock — owns data fetching */}
        <OrdersPanel initialProducts={initialProducts} />

        {/* Order status summary */}
        <OrderStatusSection />

        {/* Admin-only extra panels */}
        <AdminExtra />

        {/* Charts — owns data fetching */}
        <RevenueCharts />

        {/* Recent products — localStorage based, instant */}
        <RecentProductsSection />

      </div>
    </div>
  );
}
