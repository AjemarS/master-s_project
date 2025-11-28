// import { getCurrentUser } from "~/lib/auth";

import { useCurrentUser } from "~/lib/auth-client";
import { DashboardPageClient } from "./page.client";

export default function DashboardPage() {
  // const user = await getCurrentUser(); TODO
  const { session } = useCurrentUser();

  return <DashboardPageClient user={session} />;
}
