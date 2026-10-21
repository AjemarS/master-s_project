import { getLocale } from "next-intl/server";
import { redirect } from "~/i18n/navigation";

export const dynamic = "force-dynamic";

// Old link: the personal area moved to /my/overview
export default async function DashboardRedirect() {
  const locale = await getLocale();
  redirect({ href: "/my/overview", locale });
}
