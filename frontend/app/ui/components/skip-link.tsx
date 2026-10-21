import { getTranslations } from "next-intl/server";

/** First focusable element: keyboard users jump past the header straight to the page */
export async function SkipLink() {
  const t = await getTranslations("common");
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
    >
      {t("skipToContent")}
    </a>
  );
}
