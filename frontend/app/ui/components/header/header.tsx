"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useState } from "react";

import { Cart } from "~/ui/components/cart/cart";

import { NotificationsWidget } from "../notifications/notifications-widget";
import { ThemeToggle } from "../theme-toggle";
import { useCurrentUser } from "~/lib/auth-client";
import { DesktopNavigation } from "./header-desktop-nav";
import { AuthSection } from "./header-auth";
import { MobileMenu, MobileMenuButton } from "./header-mobile-menu";

interface HeaderProps {
  children?: React.ReactNode;
  showAuth?: boolean;
}

export type NavigationSection = "main" | "dashboard" | "admin";

export const mainNavigation = [
  { href: "/", name: "Home" },
  { href: "/products", name: "Products" },
];

const dashboardNavigation = [
  { href: "/dashboard/stats", name: "Stats" },
  { href: "/dashboard/profile", name: "Profile" },
  { href: "/dashboard/settings", name: "Settings" },
];

const adminNavigation = [
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
        Store
      </span>
    </Link>
  );
});

const HeaderLeft = memo(function HeaderLeft({
  navigation,
  pathname,
}: {
  navigation: typeof mainNavigation;
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

  const matchedRule = rules.find((r) => pathname.startsWith(r.prefix));

  // Determine where the user actually is, falling back to "main" if they
  // shouldn't be in the matched section (e.g. non-admin on /admin/*).
  let whereAmI: NavigationSection = "main";
  if (matchedRule) {
    if (matchedRule.where === "admin") {
      // Set admin nav immediately while session loads, instead of flashing main nav.
      // If session resolves and user isn't admin, the proxy will have already
      // redirected them away — so this state is unreachable for non-admins.
      whereAmI = "admin";
    } else if (matchedRule.where === "dashboard" && user) {
      whereAmI = "dashboard";
    }
  }

  const navigation =
    whereAmI === "main"
      ? mainNavigation
      : whereAmI === "dashboard"
        ? dashboardNavigation
        : adminNavigation;

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
          {/* Logo and Desktop Navigation */}
          <HeaderLeft navigation={navigation} pathname={pathname} />

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {whereAmI !== "admin" && <Cart />}

            <NotificationsWidget />

            {showAuth && <AuthSection user={user!} whereAmI={whereAmI} />}

            <ThemeToggle />

            <MobileMenuButton
              isOpen={mobileMenuOpen}
              onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <MobileMenu
          navigation={navigation}
          pathname={pathname}
          showAuth={showAuth}
          user={user!}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
