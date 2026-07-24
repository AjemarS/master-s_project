"use client";

import Link from "next/link";
import { PlusCircle, ShoppingCart, FileText, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { BarChart, Bar, ResponsiveContainer } from "recharts";

interface QuickActionsCardProps {
  isAdmin: boolean;
  isWhWorker: boolean;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function QuickActionsCard({
  isAdmin,
  isWhWorker,
  dailyRevenue,
  tSum,
  tc,
}: QuickActionsCardProps) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          {tSum("quickActions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdmin && (
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/admin/products">
              <PlusCircle className="h-4 w-4 mr-2" /> {tSum("addProduct")}
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/admin/orders">
            <ShoppingCart className="h-4 w-4 mr-2" /> {tSum("viewOrders")}
          </Link>
        </Button>
        {(isAdmin || isWhWorker) && (
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/admin/goods-receipts">
              <FileText className="h-4 w-4 mr-2" /> {tSum("createGrn")}
            </Link>
          </Button>
        )}
        {dailyRevenue.length > 0 && (
          <div className="mt-4 pt-4 border-t dark:border-border">
            <div className="text-xs text-muted-foreground mb-2">
              {tSum("revenue30days")}
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={dailyRevenue}>
                <Bar dataKey="revenue" fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
