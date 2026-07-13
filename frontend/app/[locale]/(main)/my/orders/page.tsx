import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "~/ui/components/page-header";
import { MyOrdersClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const t = await getTranslations("orders");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
      />
      <Suspense
        fallback={
          <div className="text-center py-12 text-muted-foreground">
            {t("loading")}
          </div>
        }
      >
        <MyOrdersClient />
      </Suspense>
    </div>
  );
}
