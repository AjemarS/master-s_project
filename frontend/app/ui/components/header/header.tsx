"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { memo, useState } from "react";

import { Cart } from "~/ui/components/cart/cart";

import { NotificationsWidget } from "../notifications/notifications-widget";
import { ThemeToggle } from "../theme-toggle";
import { useCurrentUser } from "~/lib/auth-client";
import { DesktopNavigation } from "./header-desktop-nav";
import { AuthSection } from "./header-auth";
import { MobileMenu, MobileMenuButton } from "./header-mobile-menu";
import { usePathname } from "~/i18n/navigation";

interface HeaderProps {
  children?: React.ReactNode;
  showAuth?: boolean;
}

export type NavigationSection = "main" | "dashboard" | "admin";
export type NavItem = { href: string; name: string };

const dashboardNavigation: NavItem[] = [
  { href: "/dashboard/stats", name: "Stats" },
  { href: "/dashboard/profile", name: "Profile" },
  { href: "/dashboard/settings", name: "Settings" },
  { href: "/orders", name: "My Orders" },
];

const adminNavigation: NavItem[] = [
  { href: "/admin/summary", name: "Summary" },
  { href: "/admin/users", name: "Users" },
  { href: "/admin/products", name: "Products" },
];

const rules = [
  { prefix: "/dashboard/", nav: dashboardNavigation, where: "dashboard" as const },
  { prefix: "/admin/", nav: adminNavigation, where: "admin" as const },
];

export const isInDashboardOrAdmin = (section: NavigationSection) =>
  section === "dashboard" || section === "admin";

export const isActive = (href: string, current: string) =>
  current === href || (href !== "/" && current?.startsWith(href));

const Logo = memo(function Logo() {
  return (
    <Link className="flex items-center gap-2" href="/">
      <span className="text-xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text tracking-tight text-transparent">
        TechHub
      </span>
    </Link>
  );
});

const HeaderLeft = memo(function HeaderLeft({
  navigation,
  pathname,
}: {
  navigation: NavItem[];
  pathname: string;
}) {
  return (
    <div className="flex items-center gap-6">
      <Logo />
      <DesktopNavigation navigation={navigation} pathname={pathname} />
    </div>
  );
});

export function Header({ showAuth = true }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const matchedRule = rules.find((r) => pathname.startsWith(r.prefix));

  let whereAmI: NavigationSection = "main";
  if (matchedRule) {
    if (matchedRule.where === "admin") {
      whereAmI = "admin";
    } else if (matchedRule.where === "dashboard" && user) {
      whereAmI = "dashboard";
    }
  }

  const mainNavigation: NavItem[] = [
    { href: "/", name: t("home") },
    { href: "/products", name: t("products") },
    { href: "/orders", name: t("orders") },
  ];

  const navigation =
    whereAmI === "main"
      ? mainNavigation
      : whereAmI === "dashboard"
        ? dashboardNavigation
        : adminNavigation;

  const currentLocale = useLocale();

  return (
    <header
      className={`
        sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur
        supports-backdrop-filter:bg-background/60
      `}
    >
      <div
        className={`
          container mx-auto max-w-7xl px-4
          sm:px-6
          lg:px-8
        `}
      >
        <div className="flex h-16 items-center justify-between">
          <HeaderLeft navigation={navigation} pathname={pathname} />

          <div className="flex items-center gap-4">
            {whereAmI !== "admin" && <Cart />}

            <NotificationsWidget />

            <div className="flex items-center gap-1">
              {[
                { code: "ua", label: "UA" },
                { code: "en", label: "EN" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    window.location.href = `/${lang.code}${pathname}`;
                  }}
                  className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                    lang.code === currentLocale
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {showAuth && <AuthSection user={user} whereAmI={whereAmI} />}

            <ThemeToggle />

            <MobileMenuButton
              isOpen={mobileMenuOpen}
              onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <MobileMenu
          navigation={navigation}
          pathname={pathname}
          showAuth={showAuth}
          user={user}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
