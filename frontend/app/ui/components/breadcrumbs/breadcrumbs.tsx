// Breadcrumbs

"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { usePathname, Link } from "~/i18n/navigation";
import { useBreadcrumbSegments, type BreadcrumbItem } from "./breadcrumbs-context";

const SEGMENT_LABEL_MAP: Record<string, string> = {
  "my": "nav.myOrders",
  "overview": "nav.overview",
  "orders": "nav.orders",
  "profile": "nav.myProfile",
  "settings": "nav.settings",
  "security": "nav.mySecurity",
  "notifications": "nav.myNotifications",
  "products": "nav.products",
  "admin": "common.admin",
  "categories": "nav.categories",
  "warehouses": "nav.warehouses",
  "suppliers": "nav.suppliers",
  "goods-receipts": "nav.goodsReceipts",
  "stock-movements": "nav.stockMovements",
  "reports": "nav.reports",
  "users": "nav.users",
  "summary": "summary.title",
  "checkout": "checkout.title",
  "pos": "nav.pos",
  "account": "nav.myProfile",
  "sign-in": "common.signIn",
  "sign-up": "common.signUp",
  "forgot-password": "common.forgotPassword",
  "reset-password": "common.resetPassword",
  "sign-out": "common.signOut",
  "favorites": "nav.favorites",
};

function formatSegment(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function autoGenerate(pathname: string, t: (key: string) => string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: t("nav.home"), href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += "/" + segment;

    const labelKey = SEGMENT_LABEL_MAP[segment];
    const label = labelKey ? t(labelKey) : formatSegment(segment);
    const isLast = currentPath === pathname;

    items.push({ label, href: isLast ? undefined : currentPath });
  }

  return items;
}

export function Breadcrumbs() {
  const t = useTranslations();
  const pathname = usePathname();
  const { segments: overrideSegments } = useBreadcrumbSegments();

  // Hide breadcrumbs on account/settings/auth pages
  if (pathname.includes("/my/") || pathname.includes("/sign-in") || 
      pathname.includes("/sign-up") || pathname.includes("/forgot-password") ||
      pathname.includes("/reset-password") || pathname.includes("/mfa")) return null;

  const items = overrideSegments ?? autoGenerate(pathname, t);

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="py-3 text-sm">
      <ol className="flex items-center gap-1">
        {items.map((item, i) => (
          <li           key={item.href || item.label} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
