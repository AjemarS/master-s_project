"use client";

import { useTranslations } from "next-intl";
import { useCurrentUser } from "~/lib/auth-client";
import {
  ActivityFeed,
  QuickActionsCard,
} from "../dashboard";

export function SystemSection() {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");
  const tNav = useTranslations("nav");
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const isWhWorker = user?.role === "warehouse_worker";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <ActivityFeed tSum={tSum} tc={tc} />
      <QuickActionsCard
        isAdmin={isAdmin}
        isWhWorker={isWhWorker}
        tSum={tSum}
        tNav={tNav}
      />
    </div>
  );
}
