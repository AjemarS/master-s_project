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

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = pinned || hovered;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col border-r bg-card transition-all duration-200 ease-in-out",
        isExpanded ? "w-64" : "w-16",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pin button */}
      <button
        onClick={() => setPinned(!pinned)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-opacity"
        title={pinned ? "Відкріпити" : "Закріпити"}
      >
        {pinned ? <PinOff className="h-3 w-3 text-muted-foreground" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Logo */}
      <div className={cn("flex items-center px-2 mb-8 h-16 shrink-0", isExpanded ? "justify-start gap-2" : "justify-center")}>
        <Store className="h-6 w-6 text-primary shrink-0" />
        {isExpanded && <span className="text-xl font-bold">TechHub</span>}
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isExpanded ? "justify-start" : "justify-center",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={isExpanded ? undefined : item.name}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {isExpanded && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="mt-auto space-y-1 border-t px-2 pt-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            isExpanded ? "justify-start" : "justify-center",
          )}
          title={isExpanded ? undefined : "До магазину"}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {isExpanded && <span>До магазину</span>}
        </Link>
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-muted-foreground hover:text-destructive",
            isExpanded ? "justify-start" : "justify-center px-0",
          )}
          onClick={handleSignOut}
          title={isExpanded ? undefined : "Вийти"}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isExpanded && <span>Вийти</span>}
        </Button>
      </div>
    </div>
  );
}
