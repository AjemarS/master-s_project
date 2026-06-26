"use client";

import { useCurrentUser } from "~/lib/auth-client";
import type { Product } from "~/lib/types";
import { AdminDashboard } from "./admin-dashboard";
import { CashierDashboard } from "./cashier-dashboard";
import { WarehouseDashboard } from "./warehouse-dashboard";

interface SummaryPageClientProps {
  initialProducts: Product[];
}

export default function SummaryPageClient({ initialProducts }: SummaryPageClientProps) {
  const { user } = useCurrentUser();
  const role = user?.role || "user";

  switch (role) {
    case "cashier":
      return <CashierDashboard />;
    case "warehouse_worker":
      return <WarehouseDashboard initialProducts={initialProducts} />;
    default:
      return <AdminDashboard initialProducts={initialProducts} />;
  }
}
