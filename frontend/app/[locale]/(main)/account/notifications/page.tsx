import { getLocale } from "next-intl/server";
import { redirect } from "~/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsRedirect() {
  const locale = await getLocale();
  redirect({ href: "/my/settings", locale });
}
