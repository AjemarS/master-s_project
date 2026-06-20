"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Users, Package, LayoutDashboard, LogOut, Store, Warehouse, ShoppingCart, ClipboardList, CreditCard, BarChart3, Truck, ExternalLink, Pin, PinOff } from "lucide-react";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Огляд", href: "/admin/summary", icon: LayoutDashboard },
  { name: "Товари", href: "/admin/products", icon: Package },
  { name: "Замовлення", href: "/admin/orders", icon: ShoppingCart },
  { name: "POS", href: "/admin/pos", icon: CreditCard },
  { name: "Склади", href: "/admin/warehouses", icon: Warehouse },
  { name: "Постачальники", href: "/admin/suppliers", icon: Truck },
  { name: "Накладні", href: "/admin/goods-receipts", icon: ClipboardList },
  { name: "Звіти", href: "/admin/reports", icon: BarChart3 },
  { name: "Користувачі", href: "/admin/users", icon: Users },
];

const TEXT_DELAY = 180;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showText, setShowText] = useState(false);
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
        title={pinned ? "Відкріпити" : "Закріпити"}
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
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors duration-100",
                isExpanded ? "gap-3 px-3" : "justify-center",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={isExpanded ? undefined : item.name}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isExpanded && (
                <span
                  className={cn(
                    "transition-opacity duration-100",
                    textVisible ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="mt-auto space-y-1 border-t px-2 pt-4">
        <Link
          href="/"
          className={cn(
            "flex items-center rounded-md py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-100",
            isExpanded ? "gap-3 px-3" : "justify-center",
          )}
          title={isExpanded ? undefined : "До магазину"}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          {isExpanded && (
            <span
              className={cn(
                "transition-opacity duration-100",
                textVisible ? "opacity-100" : "opacity-0",
              )}
            >
              До магазину
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-destructive transition-colors duration-100",
            isExpanded ? "gap-3 px-3" : "justify-center px-0",
          )}
          onClick={handleSignOut}
          title={isExpanded ? undefined : "Вийти"}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {isExpanded && (
            <span
              className={cn(
                "transition-opacity duration-100",
                textVisible ? "opacity-100" : "opacity-0",
              )}
            >
              Вийти
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
