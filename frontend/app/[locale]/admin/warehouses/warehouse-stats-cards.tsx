"use client";

import { useTranslations } from "next-intl";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import type { Warehouse, Stock } from "~/lib/types";

interface WarehouseStatsCardsProps {
  warehouses: Warehouse[];
  stock: Stock[];
  onCardClick: (warehouse: Warehouse) => void;
}

export function WarehouseStatsCards({ warehouses, stock, onCardClick }: WarehouseStatsCardsProps) {
  const t = useTranslations("warehouses");

  if (warehouses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {warehouses.map((wh) => {
        const whStock = stock.filter((s) => s.warehouse_name === wh.name);
        const totalQty = whStock.reduce((sum, s) => sum + s.quantity, 0);
        const totalReserved = whStock.reduce((sum, s) => sum + s.reserved, 0);
        const productCount = whStock.length;
        return (
          <Card
            key={wh.id}
            className="dark:bg-card dark:border-border border-t-4 border-t-primary cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onCardClick(wh)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <WarehouseIcon className="h-4 w-4 text-primary" />
                {wh.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t("productCount")}</div>
                  <div className="text-3xl font-bold text-foreground">{productCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("totalQty")}</div>
                  <div className="text-3xl font-bold text-primary">{totalQty}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("reserved")}</div>
                  <div className="text-3xl font-bold text-accent-electric">{totalReserved}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
