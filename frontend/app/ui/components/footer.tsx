import { getTranslations } from "next-intl/server";
import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import { NewsletterForm } from "~/ui/components/newsletter-form";

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("border-t bg-background", className)}>
      {/* Newsletter section */}
        <div className="mt-28 border-b pb-28">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-2xl font-semibold">{t("newsletter")}</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              {t("newsletterDesc")}
            </p>
            <div className="mt-4 w-full max-w-md">
              <NewsletterForm />
            </div>
          </div>
        </div>
        {/* Footer links section */}
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
              <Button asChild className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Link href="https://facebook.com/techhub" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Link href="https://twitter.com/techhub" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Link href="https://instagram.com/techhub" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                </Link>
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
              <li><Link className="text-muted-foreground hover:text-foreground" href="/about">{t("about")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/delivery-payment">{t("deliveryPayment")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/warranty">{t("warranty")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/contacts">{t("contacts")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("support")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href="/faq">{t("help")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/my/orders">{t("myOrders")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/privacy">{t("privacy")}</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/terms">{t("terms")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("copyright", { year: currentYear })}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link className="text-muted-foreground hover:text-foreground" href="/privacy">{t("privacyShort")}</Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/terms">{t("termsShort")}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
