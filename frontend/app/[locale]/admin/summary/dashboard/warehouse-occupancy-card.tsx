"use client";

import { Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

interface WarehouseOccupancyItem {
  name: string;
  quantity: number;
}

interface WarehouseOccupancyCardProps {
  data: WarehouseOccupancyItem[];
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function WarehouseOccupancyCard({
  data,
  tSum,
}: WarehouseOccupancyCardProps) {
  if (data.length === 0) return null;

  const maxQuantity = Math.max(...data.map((w) => w.quantity), 1);

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <Warehouse className="h-5 w-5 text-accent-electric" />
          {tSum("warehouseOccupancy")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((wh) => (
            <div key={wh.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">{wh.name}</span>
                <span className="text-muted-foreground">
                  {tSum("units", { count: wh.quantity })}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (wh.quantity / maxQuantity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
