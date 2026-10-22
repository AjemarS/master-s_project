"use client";

import { FileSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "~/i18n/navigation";
import { Button } from "~/ui/primitives/button";
import { FadeIn } from "~/ui/components/motion/fade-in";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-warm px-4">
      <FadeIn direction="up">
        <div className="flex flex-col items-center space-y-6 text-center">
          <FileSearch className="h-24 w-24 text-muted-foreground" aria-hidden />
          <h1 className="text-6xl font-bold tracking-tight text-foreground">
            404
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("notFoundTitle")}
          </p>
          <p className="max-w-md text-muted-foreground">
            {t("notFoundDesc")}
          </p>
          <Button asChild>
            <Link href="/">
              {t("toHome")}
            </Link>
          </Button>
        </div>
      </FadeIn>
    </main>
  );
}
