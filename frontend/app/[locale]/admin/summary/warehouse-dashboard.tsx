"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Warehouse, AlertCircle, ClipboardList, ArrowRightLeft,
  LayoutDashboard, PlusCircle, Truck, Package,
} from "lucide-react";
import type { Product } from "~/lib/types";
import { StatsCardSkeleton, AdminPageHeader } from "../components";
import { useGoodsReceipts, useStockMovements } from "~/lib/hooks/use-api-data";

interface WarehouseDashboardProps {
  initialProducts: Product[];
}

export function WarehouseDashboard({ initialProducts }: WarehouseDashboardProps) {
  const tSum = useTranslations("summary");
  const tc = useTranslations("common");
  const tWh = useTranslations("warehouses");
  const lowStockProducts = useMemo(() => initialProducts.filter((p) => p.stock < 10), [initialProducts]);

  const { data: grnData, isLoading: grnLoading } = useGoodsReceipts();
  const { data: movementsData, isLoading: movementsLoading } = useStockMovements();

  const isLoading = grnLoading || movementsLoading;

  const recentGrns = useMemo(() => grnData?.results?.slice(0, 5) || [], [grnData]);
  const recentMovements = useMemo(() => movementsData?.results?.slice(0, 5) || [], [movementsData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/50 p-8">
        <div className="max-w-7xl mx-auto">
          <AdminPageHeader
            title={tWh("warehouse")}
            subtitle={tWh("whSubtitle")}
            icon={Warehouse}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={tWh("warehouse")}
          subtitle={tWh("whSubtitle")}
          icon={Warehouse}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 border-t-destructive dark:bg-card dark:border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tSum("lowStock")}</CardTitle>
              <AlertCircle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{lowStockProducts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{tSum("lowStockDesc")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 border-t-accent-electric dark:bg-card dark:border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tWh("totalProducts")}</CardTitle>
              <Package className="h-5 w-5 text-accent-electric" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {initialProducts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tWh("inCatalog")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 border-t-primary dark:bg-card dark:border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tWh("recentGrns")}</CardTitle>
              <ClipboardList className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{recentGrns.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{tWh("recentPeriod")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 border-t-4 border-t-primary dark:bg-card dark:border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tWh("movements")}</CardTitle>
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{recentMovements.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{tWh("recentOperations")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  {tSum("lowStock")}
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/products">{tSum("viewAll")}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{tSum("inStock")}</p>
              ) : (
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                      <Badge variant="destructive" className="shrink-0">{tSum("units", { count: p.stock })}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {tWh("recentGrns")}
                </CardTitle>
                <Link href="/admin/goods-receipts">
                  <Button variant="outline" size="sm">{tc("all")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentGrns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{tWh("noGrns")}</p>
              ) : (
                <div className="space-y-2">
                  {recentGrns.map((grn) => (
                    <div key={grn.id} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-accent/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-foreground">#{grn.id}</span>
                        <span className="text-xs text-muted-foreground">{grn.supplier_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{grn.receipt_date?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  {tWh("recentMovements")}
                </CardTitle>
                <Link href="/admin/stock-movements">
                  <Button variant="outline" size="sm">{tc("all")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{tWh("noMovements")}</p>
              ) : (
                <div className="space-y-2">
                  {recentMovements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-accent/10 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {m.from_warehouse_name || "?"} → {m.to_warehouse_name || "?"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{tSum("units", { count: m.quantity })}</span>
                        <Badge variant="outline" className="text-xs">{m.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <LayoutDashboard className="h-5 w-5 text-primary" />
                {tSum("quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="default" className="w-full justify-start bg-accent-electric hover:bg-accent-electric/90">
              <Link href="/admin/goods-receipts"><PlusCircle className="h-4 w-4 mr-2" /> {tSum("createGrn")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/warehouses"><Warehouse className="h-4 w-4 mr-2" /> {tWh("manageWarehouses")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/stock-movements"><ArrowRightLeft className="h-4 w-4 mr-2" /> {tWh("moveProducts")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/suppliers"><Truck className="h-4 w-4 mr-2" /> {tWh("suppliersLink")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
