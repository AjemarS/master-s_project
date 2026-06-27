"use client";

import { Link, usePathname } from "~/i18n/navigation";
import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Package, LayoutDashboard, LogOut, Store, Warehouse,
  ShoppingCart, BarChart3,
  ExternalLink, Pin, PinOff,
  ChevronDown,
} from "lucide-react";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "~/ui/primitives/collapsible";
import { useCurrentUser } from "~/lib/auth-client";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "~/i18n/navigation";

interface NavChild {
  key: string;
  href: string;
}

interface NavGroup {
  key: string;
  href?: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  children?: NavChild[];
}

const navigationGroups: NavGroup[] = [
  { key: "dashboard", href: "/admin/summary", icon: LayoutDashboard, roles: ["admin", "cashier", "warehouse_worker"] },
  {
    key: "products", icon: Package, roles: ["admin", "cashier"],
    children: [
      { key: "products", href: "/admin/products" },
      { key: "categories", href: "/admin/categories" },
    ],
  },
  {
    key: "orders", icon: ShoppingCart, roles: ["admin", "cashier"],
    children: [
      { key: "orders", href: "/admin/orders" },
      { key: "pos", href: "/admin/pos" },
    ],
  },
  {
    key: "inventory", icon: Warehouse, roles: ["admin", "warehouse_worker"],
    children: [
      { key: "warehouses", href: "/admin/warehouses" },
      { key: "stockMovements", href: "/admin/stock-movements" },
      { key: "goodsReceipts", href: "/admin/goods-receipts" },
      { key: "suppliers", href: "/admin/suppliers" },
    ],
  },
  { key: "reports", href: "/admin/reports", icon: BarChart3, roles: ["admin"] },
  { key: "users", href: "/admin/users", icon: Users, roles: ["admin"] },
];

const TEXT_DELAY = 150;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const { user } = useCurrentUser();

  const userRole = user?.role || "admin";
  const groups = navigationGroups.filter((g) =>
    g.roles.includes(userRole) || userRole === "admin"
  );

  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showText, setShowText] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      if (g.children?.some((c) => pathname.startsWith(c.href))) {
        initial[g.key] = true;
      }
    }
    return initial;
  });
  const showTextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = pinned || hovered;
  const textVisible = pinned || showText;

  const handleMouseEnter = useCallback(() => {
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    setHovered(true);
    if (!pinned) {
      showTextTimeoutRef.current = setTimeout(() => setShowText(true), TEXT_DELAY);
    }
  }, [pinned]);

  const handleMouseLeave = useCallback(() => {
    if (showTextTimeoutRef.current) clearTimeout(showTextTimeoutRef.current);
    setShowText(false);
    collapseTimeoutRef.current = setTimeout(() => setHovered(false), 100);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const anyChildActive = (group: NavGroup) =>
    group.children?.some((c) => pathname.startsWith(c.href)) ?? false;

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col border-r bg-card transition-[width] duration-200 ease-out",
        isExpanded ? "w-64" : "w-14",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pin button */}
      <button
        onClick={() => setPinned(!pinned)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
        title={pinned ? tNav("unpin") : tNav("pin")}
      >
        {pinned ? <PinOff className="h-3 w-3 text-muted-foreground" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Logo */}
      <div className={cn("flex items-center h-16 shrink-0 px-2 mb-8", isExpanded ? "gap-2" : "justify-center gap-0")}>
        <Store className="h-6 w-6 shrink-0 text-primary" />
        {isExpanded && (
          <span
            className={cn(
              "text-xl font-bold transition-opacity duration-100",
              textVisible ? "opacity-100" : "opacity-0",
            )}
          >
            TechHub
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {groups.map((group) => {
          if (!group.children) {
            const isActive = pathname.startsWith(group.href!);
            return (
              <Link
                key={group.key}
                href={group.href!}
                className={cn(
                  "flex items-center rounded-md py-2 text-sm font-medium transition-colors duration-100",
                  isExpanded ? "gap-3 px-3 justify-start" : "justify-center",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={isExpanded ? undefined : tNav(group.key)}
              >
                <group.icon className="h-5 w-5 shrink-0" />
                {isExpanded && (
                  <span className={cn("transition-opacity duration-100", textVisible ? "opacity-100" : "opacity-0")}>
                    {tNav(group.key)}
                  </span>
                )}
              </Link>
            );
          }

          const isActive = anyChildActive(group);
          const isOpen = openGroups[group.key] ?? false;

          return (
            <Collapsible key={group.key} open={isOpen} onOpenChange={() => toggleGroup(group.key)}>
              <CollapsibleTrigger
                className={cn(
                  "flex w-full items-center rounded-md py-2 text-sm font-medium transition-colors duration-100 group",
                  isExpanded ? "gap-3 px-3 justify-start" : "justify-center",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={isExpanded ? undefined : tNav(group.key)}
              >
                <group.icon className="h-5 w-5 shrink-0" />
                {isExpanded && (
                  <>
                    <span className={cn("flex-1 text-left transition-opacity duration-100", textVisible ? "opacity-100" : "opacity-0")}>
                      {tNav(group.key)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
                <div className={cn("mt-1 space-y-1", isExpanded ? "px-3" : "")}>
                  {group.children.map((child) => {
                    const isChildActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={cn(
                          "flex items-center rounded-md py-1.5 text-sm font-medium transition-colors duration-100",
                          isExpanded ? "gap-3 pl-9 justify-start" : "justify-center",
                          isChildActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        title={isExpanded ? undefined : tNav(child.key)}
                      >
                        {isExpanded ? (
                          <span className={cn("transition-opacity duration-100", textVisible ? "opacity-100" : "opacity-0")}>
                            {tNav(child.key)}
                          </span>
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="mt-auto space-y-1 border-t px-2 pt-4">
        <Link
          href="/"
          className={cn(
            "flex items-center rounded-md py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-100",
            isExpanded ? "gap-3 px-3 justify-start" : "justify-center",
          )}
          title={isExpanded ? undefined : tNav("toStore")}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          {isExpanded && (
            <span className={cn("transition-opacity duration-100", textVisible ? "opacity-100" : "opacity-0")}>
              {tNav("toStore")}
            </span>
          )}
        </Link>
        {isExpanded && (
          <div className="flex items-center gap-1 px-1 py-1">
            {[
              { code: "ua", label: "UA" },
              { code: "en", label: "EN" },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => { window.location.href = `/${lang.code}${pathname}`; }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded font-medium transition-colors",
                  lang.code === "ua"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-destructive transition-colors duration-100",
            isExpanded ? "gap-3 px-3 justify-start" : "justify-center px-0",
          )}
          onClick={handleSignOut}
          title={isExpanded ? undefined : tNav("signOut")}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {isExpanded && (
            <span className={cn("transition-opacity duration-100", textVisible ? "opacity-100" : "opacity-0")}>
              {tNav("signOut")}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
