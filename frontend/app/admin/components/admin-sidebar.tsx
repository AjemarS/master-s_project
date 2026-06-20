"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Package, LayoutDashboard, LogOut, Store, Warehouse, ShoppingCart, ClipboardList, CreditCard, BarChart3, Truck, ExternalLink } from "lucide-react";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Огляд", href: "/admin/summary", icon: LayoutDashboard },
  { name: "Товари", href: "/admin/products", icon: Package },
  { name: "Замовлення", href: "/admin/orders", icon: ShoppingCart },
  { name: "POS-термінал", href: "/admin/pos", icon: CreditCard },
  { name: "Склади", href: "/admin/warehouses", icon: Warehouse },
  { name: "Постачальники", href: "/admin/suppliers", icon: Truck },
  { name: "Накладні", href: "/admin/goods-receipts", icon: ClipboardList },
  { name: "Звіти", href: "/admin/reports", icon: BarChart3 },
  { name: "Користувачі", href: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen w-64 flex-col border-r bg-card px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <Store className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">TechHub</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          До магазину
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Вийти
        </Button>
      </div>
    </div>
  );
}
