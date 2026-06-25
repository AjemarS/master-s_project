"use client";

import { useCurrentUser } from "~/lib/auth-client";
import { DashboardPageClient } from "./page.client";

export default function DashboardPage() {
  const { user } = useCurrentUser();

  return <DashboardPageClient user={user} />;
}
