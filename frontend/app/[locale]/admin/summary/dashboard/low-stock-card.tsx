"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";

interface LowStockProduct {
  id: number;
  name: string;
  stock: number;
}

interface LowStockCardProps {
  lowStockData: unknown;
  initialProducts: LowStockProduct[];
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function LowStockCard({
  lowStockData,
  initialProducts,
  tSum,
}: LowStockCardProps) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
            <AlertCircle className="h-5 w-5 text-accent-electric" />
            {tSum("lowStock")}
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products">{tSum("viewAll")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          const raw = lowStockData as
            | { results?: { id: number; name: string; stock: number }[] }
            | undefined;
          const lowItems = Array.isArray(lowStockData) ? lowStockData : (raw?.results || []);
          const items =
            lowItems.length > 0
              ? lowItems.slice(0, 10)
              : initialProducts.filter((p) => p.stock < 10).slice(0, 10);

          if (items.length === 0) {
            return (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tSum("inStock")}
              </p>
            );
          }

          return (
            <div className="space-y-1">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {p.name}
                    </span>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {tSum("units", { count: p.stock })}
                  </Badge>
                </div>
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
