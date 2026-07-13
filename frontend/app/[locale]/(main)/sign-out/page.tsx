import { getTranslations } from "next-intl/server";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "~/ui/components/page-header";
import { Shell } from "~/ui/primitives/shell";
import { SignOutPageClient } from "./page.client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signOut" });
  return {
    title: t("pageTitle"),
    description: t("confirmMessage"),
    metadataBase: new URL(process.env.NEXT_SERVER_APP_URL || "http://localhost:3000"),
  };
}

export default async function SignOutPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signOut" });

  return (
    <Shell>
      <PageHeader>
        <PageHeaderHeading>{t("pageTitle")}</PageHeaderHeading>
        <PageHeaderDescription>{t("confirmMessage")}</PageHeaderDescription>
      </PageHeader>
      <SignOutPageClient />
    </Shell>
  );
}
