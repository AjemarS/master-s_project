"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Card, CardContent } from "~/ui/primitives/card";

interface NavItem {
  key: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}

interface NavSectionProps {
  items: NavItem[];
  tNav: (key: string, values?: Record<string, string | number | Date>) => string;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function NavSection({ items, tNav, tSum }: NavSectionProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-4">{tSum("sections")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="dark:bg-card dark:border-border hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{tNav(item.key)}</div>
                  <div className="text-xs text-muted-foreground truncate">{tNav(item.key + "Desc")}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
