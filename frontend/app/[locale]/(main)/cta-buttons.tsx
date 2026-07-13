"use client";

import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";

export function CtaButtons() {
  const t = useTranslations("home");
  const router = useRouter();

  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Button
        className="h-12 px-8 transition-colors duration-200"
        onClick={() => router.push("/sign-up")}
        size="lg"
      >
        {t("ctaSignUp")}
      </Button>
      <Button
        className="h-12 px-8 transition-colors duration-200"
        onClick={() => router.push("/products")}
        size="lg"
        variant="outline"
      >
        {t("ctaCatalog")}
      </Button>
    </div>
  );
}
