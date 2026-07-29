"use client";

import { useTranslations } from "next-intl";
import { useCurrentUser } from "~/lib/auth-client";
import {
  SupplierPerformanceCard,
  RecentDeliveriesCard,
} from "../dashboard";

export function AdminExtra() {
  const tSum = useTranslations("summary");
  const { user } = useCurrentUser();

  if (user?.role !== "admin") return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <SupplierPerformanceCard tSum={tSum} />
      <RecentDeliveriesCard tSum={tSum} />
    </div>
  );
}
