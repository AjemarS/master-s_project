"use client";

import { Link, usePathname } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { User } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Menu, X } from "lucide-react";

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <Button
      className="md:hidden"
      onClick={onToggle}
      size="icon"
      variant="ghost"
      aria-label="Toggle menu"
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

interface MobileMenuProps {
  showAuth: boolean;
  user: User | undefined;
  onClose: () => void;
}

export function MobileMenu({ showAuth, user, onClose }: MobileMenuProps) {
  const t = useTranslations("common");
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {showAuth && !user && (
        <div className="space-y-1 border-b px-4 py-3">
          <Link
            className="block rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted/50"
            href="/sign-in"
            onClick={onClose}
          >
            {t("signIn")}
          </Link>
          <Link
            className="block rounded-md bg-accent-electric px-3 py-2 text-base font-medium text-accent-electric-foreground transition-colors hover:bg-accent-electric/90"
            href="/sign-up"
            onClick={onClose}
          >
            {t("signUp")}
          </Link>
        </div>
      )}

      {/* Language switcher */}
      <div className="border-b px-4 py-3">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("language")}
        </p>
        <div className="space-y-1">
          {[
            { code: "ua", label: "Українська" },
            { code: "en", label: "English" },
          ].map((lang) => (
            <Link
              key={lang.code}
              href={`/${lang.code}${pathname}`}
              className="block rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted/50"
              onClick={onClose}
            >
              {lang.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
