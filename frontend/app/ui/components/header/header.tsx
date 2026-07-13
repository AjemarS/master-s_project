"use client";

import { useLocale } from "next-intl";
import { memo, useState } from "react";
import { Globe, Search, X } from "lucide-react";

import { Cart } from "~/ui/components/cart/cart";

import { NotificationsWidget } from "../notifications/notifications-widget";
import { ThemeToggle } from "../theme-toggle";
import { useCurrentUser } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/primitives/dropdown-menu";

import { AuthSection } from "./header-auth";
import { MobileMenu, MobileMenuButton } from "./header-mobile-menu";
import { SearchBar } from "./search-overlay";
import { Link, usePathname } from "~/i18n/navigation";

interface HeaderProps {
  children?: React.ReactNode;
  showAuth?: boolean;
}

export type NavigationSection = "main" | "dashboard" | "admin";
export type NavItem = { href: string; name: string };

// These arrays are used only for prefix matching via the `rules` array below
// to determine `whereAmI` (main / dashboard / admin). They are NOT rendered
// as navigation links — DesktopNavigation component is unused.
const adminNavigation: NavItem[] = [
  { href: "/admin/summary", name: "Summary" },
  { href: "/admin/users", name: "Users" },
  { href: "/admin/products", name: "Products" },
];

const userNavigation: NavItem[] = [
  { href: "/my/overview", name: "Overview" },
  { href: "/my/orders", name: "My Orders" },
  { href: "/my/settings", name: "Settings" },
];

const rules = [
  { prefix: "/admin/", nav: adminNavigation, where: "admin" as const },
  { prefix: "/my/", nav: userNavigation, where: "dashboard" as const },
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

export function Header({ showAuth = true }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const matchedRule = rules.find((r) => pathname.startsWith(r.prefix));

  let whereAmI: NavigationSection = "main";
  if (matchedRule) {
    if (matchedRule.where === "admin") {
      whereAmI = "admin";
    } else if (matchedRule.where === "dashboard" && user) {
      whereAmI = "dashboard";
    }
  }

  const currentLocale = useLocale();

  return (
    <>
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
        <div className="grid h-16 grid-cols-[33fr_34fr_33fr] items-center gap-4">
          {/* Left */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Center: Desktop search */}
          <div className="hidden md:flex justify-center">
            <SearchBar />
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-4">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Search"
              type="button"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {whereAmI !== "admin" && <Cart />}

            <NotificationsWidget />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => { window.location.href = `/ua${pathname}`; }}
                  className={currentLocale === "ua" ? "font-semibold text-accent-electric" : ""}
                >
                  UA
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { window.location.href = `/en${pathname}`; }}
                  className={currentLocale === "en" ? "font-semibold text-accent-electric" : ""}
                >
                  EN
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showAuth && <AuthSection user={user} whereAmI={whereAmI} />}

            <ThemeToggle />

            <MobileMenuButton
              isOpen={mobileMenuOpen}
              onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            />
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t px-4 py-3">
          <SearchBar />
        </div>
      )}

      {mobileMenuOpen && (
        <MobileMenu
          showAuth={showAuth}
          user={user}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
    </>
  );
}
