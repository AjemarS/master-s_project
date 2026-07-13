"use client";

import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  Shield,
  Settings,
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import { authClient } from "~/lib/auth-client";

interface NavItem {
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navTop: NavItem[] = [
  { key: "overview", href: "/my/overview", icon: LayoutDashboard },
  { key: "myOrders", href: "/my/orders", icon: ShoppingBag },
];

const settingsChildren: NavItem[] = [
  { key: "myProfile", href: "/my/settings", icon: User },
  { key: "mySecurity", href: "/my/settings?tab=security", icon: Shield },
  { key: "myNotifications", href: "/my/settings?tab=notifications", icon: Bell },
];

function isSettingsActive(pathname: string): boolean {
  return pathname.startsWith("/my/settings");
}

function isChildActive(
  href: string,
  pathname: string,
  currentTab: string | null,
): boolean {
  if (href.includes("?tab=")) {
    const tab = new URLSearchParams(href.split("?")[1]).get("tab");
    return currentTab === tab;
  }
  return pathname === href && (!currentTab || currentTab === "profile");
}

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const tNav = useTranslations("nav");
  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] flex flex-col border-r w-64">
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-6">
        {navTop.map((item) => {
          const active = isChildActive(item.href, pathname, currentTab);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 justify-start rounded-md py-2 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-accent-electric/10 text-accent-electric"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={tNav(item.key)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{tNav(item.key)}</span>
            </Link>
          );
        })}

        {/* Security dropdown group */}
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex w-full items-center gap-3 px-3 justify-start rounded-md py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
              isSettingsActive(pathname)
                ? "bg-accent-electric/10 text-accent-electric"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>{tNav("settings")}</span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 transition-transform duration-200",
                settingsOpen && "rotate-180",
              )}
            />
          </button>

          {settingsOpen && settingsChildren.map((item) => {
            const active = isChildActive(item.href, pathname, currentTab);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 justify-start rounded-md py-2 text-sm font-medium transition-colors duration-200 pl-10",
                  active
                    ? "bg-accent-electric/10 text-accent-electric"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={tNav(item.key)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{tNav(item.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom links */}
      <div className="mt-auto space-y-1 border-t px-3 pt-4 pb-6">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 justify-start rounded-md py-2 text-sm font-medium transition-colors duration-200 text-muted-foreground hover:bg-muted hover:text-foreground"
          title={tNav("toStore")}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          <span>{tNav("toStore")}</span>
        </Link>

        <Button
          variant="ghost"
          className="flex items-center gap-3 px-3 justify-start w-full text-muted-foreground hover:text-destructive transition-colors duration-200"
          onClick={handleSignOut}
          title={tNav("signOut")}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>{tNav("signOut")}</span>
        </Button>
      </div>
    </aside>
  );
}
