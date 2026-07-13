import { OverviewClient } from "./page.client";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const t = await getTranslations("overview");
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-0.5 mb-8">
        <h2 className=" text-2xl font-bold tracking-tight">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>
      <OverviewClient />
    </div>
  );
}
