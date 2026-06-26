import { getLocale } from "next-intl/server";
import { redirect } from "~/i18n/navigation";

export default async function DashboardPage() {
  const locale = await getLocale();
  redirect({ href: "/dashboard/profile", locale });
}
