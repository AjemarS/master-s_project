"use client"; // TODO: remove this line when using server components
// import { getCurrentUser } from "~/lib/auth";

import { useCurrentUser } from "~/lib/auth-client";
import { DashboardPageClient } from "./page.client";

export default function DashboardPage() {
  // const user = await getCurrentUser(); TODO
  const { user } = useCurrentUser();

  return <DashboardPageClient user={user} />;
}
