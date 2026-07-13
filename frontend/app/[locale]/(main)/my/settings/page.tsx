import { Suspense } from "react";
import { SettingsClient } from "./page.client";
import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-0.5 mb-8">
        <h2 className=" text-2xl font-bold tracking-tight">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
        <SettingsClient />
      </Suspense>
    </div>
  );
}
