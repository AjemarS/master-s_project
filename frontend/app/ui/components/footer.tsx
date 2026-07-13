import { getTranslations } from "next-intl/server";
import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link className="flex items-center gap-2" href="/">
              <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                TechHub
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("tagline")}
            </p>
            <div className="flex space-x-4">
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Button>
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Button>
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Button>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("categories")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">{t("allProducts")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">{t("refrigerators")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">{t("washingMachines")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">{t("ovens")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">{t("smallAppliances")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("information")}</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="text-muted-foreground">{t("about")}</span></li>
              <li><span className="text-muted-foreground">{t("deliveryPayment")}</span></li>
              <li><span className="text-muted-foreground">{t("warranty")}</span></li>
              <li><span className="text-muted-foreground">{t("contacts")}</span></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("support")}</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="text-muted-foreground">{t("help")}</span></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/my/orders">{t("myOrders")}</Link></li>
              <li><span className="text-muted-foreground">{t("privacy")}</span></li>
              <li><span className="text-muted-foreground">{t("terms")}</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("copyright", { year: currentYear })}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="text-muted-foreground">{t("privacyShort")}</span>
              <span className="text-muted-foreground">{t("termsShort")}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
