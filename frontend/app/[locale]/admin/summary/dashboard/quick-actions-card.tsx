"use client";

import Link from "next/link";
import {
  PlusCircle, ShoppingCart, FileText, ArrowRightLeft,
  LayoutDashboard, Users, BarChart3, Tags,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";

interface QuickActionsCardProps {
  isAdmin: boolean;
  isWhWorker: boolean;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tNav: (key: string) => string;
}

export default function QuickActionsCard({
  isAdmin,
  isWhWorker,
  tSum,
  tNav,
}: QuickActionsCardProps) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          {tSum("quickActions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {isAdmin && (
            <Button asChild variant="outline" className="justify-start h-auto py-2.5">
              <Link href="/admin/products">
                <PlusCircle className="h-4 w-4 mr-2 shrink-0" /> {tSum("addProduct")}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="justify-start h-auto py-2.5">
            <Link href="/admin/orders">
              <ShoppingCart className="h-4 w-4 mr-2 shrink-0" /> {tSum("viewOrders")}
            </Link>
          </Button>
          {(isAdmin || isWhWorker) && (
            <>
              <Button asChild variant="outline" className="justify-start h-auto py-2.5">
                <Link href="/admin/goods-receipts">
                  <FileText className="h-4 w-4 mr-2 shrink-0" /> {tSum("createGrn")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-2.5">
                <Link href="/admin/stock-movements">
                  <ArrowRightLeft className="h-4 w-4 mr-2 shrink-0" /> {tNav("stockMovements")}
                </Link>
              </Button>
            </>
          )}
          {isAdmin && (
            <>
              <Button asChild variant="outline" className="justify-start h-auto py-2.5">
                <Link href="/admin/categories">
                  <Tags className="h-4 w-4 mr-2 shrink-0" /> {tNav("categories")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-2.5">
                <Link href="/admin/reports">
                  <BarChart3 className="h-4 w-4 mr-2 shrink-0" /> {tNav("reports")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-2.5">
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2 shrink-0" /> {tNav("users")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
