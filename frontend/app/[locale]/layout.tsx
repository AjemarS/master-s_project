import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "en"
      ? "TechHub | Home Appliances"
      : "TechHub | Побутова техніка";
  const description =
    locale === "en"
      ? "TechHub — online store of home appliances. Great prices, fast delivery."
      : "TechHub — інтернет-магазин побутової техніки. Вигідні ціни, швидка доставка.";
  return {
    description,
    title,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
