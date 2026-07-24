"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";

interface RecentProduct {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
}

interface RecentProductsCardProps {
  products: RecentProduct[];
  onClear: () => void;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string, values?: Record<string, string | number | Date>) => string;
  formatCurrency: (v: number) => string;
}

export default function RecentProductsCard({
  products,
  onClear,
  tSum,
  tc,
  formatCurrency,
}: RecentProductsCardProps) {
  if (products.length === 0) return null;

  return (
    <Card className="dark:bg-card dark:border-border mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            {tSum("recentProducts")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>
            {tc("clear")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.map((p) => (
            <Link
              key={p.id}
              href="/admin/products"
              className="shrink-0 w-48 p-3 border rounded-lg dark:border-border hover:bg-accent/10 transition-colors"
            >
              <div className="text-sm font-medium text-foreground truncate">
                {p.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(p.price)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ID: #{p.id}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
