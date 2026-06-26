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
import { StatsCardSkeleton } from "../components";
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
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <Warehouse className="h-10 w-10 text-orange-600" />
              {tWh("warehouse")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{tWh("whSubtitle")}</p>
          </div>
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <Warehouse className="h-10 w-10 text-orange-600" />
            {tWh("warehouse")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{tWh("whSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tSum("lowStock")}</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{lowStockProducts.length}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tSum("lowStockDesc")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tWh("totalProducts")}</CardTitle>
              <Package className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {initialProducts.length}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tWh("inCatalog")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tWh("recentGrns")}</CardTitle>
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{recentGrns.length}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tWh("recentPeriod")}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500 dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">{tWh("movements")}</CardTitle>
              <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{recentMovements.length}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tWh("recentOperations")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  {tSum("lowStock")}
                </CardTitle>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm">{tSum("viewAll")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tSum("inStock")}</p>
              ) : (
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                      <Badge variant="destructive" className="shrink-0">{tSum("units", { count: p.stock })}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  {tWh("recentGrns")}
                </CardTitle>
                <Link href="/admin/goods-receipts">
                  <Button variant="outline" size="sm">{tc("all")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentGrns.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tWh("noGrns")}</p>
              ) : (
                <div className="space-y-2">
                  {recentGrns.map((grn) => (
                    <div key={grn.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">#{grn.id}</span>
                        <span className="text-xs text-slate-500">{grn.supplier_name}</span>
                      </div>
                      <span className="text-xs text-slate-400">{grn.receipt_date?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
                  <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                  {tWh("recentMovements")}
                </CardTitle>
                <Link href="/admin/stock-movements">
                  <Button variant="outline" size="sm">{tc("all")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMovements.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">{tWh("noMovements")}</p>
              ) : (
                <div className="space-y-2">
                  {recentMovements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {m.from_warehouse_name || "?"} → {m.to_warehouse_name || "?"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-500">{tSum("units", { count: m.quantity })}</span>
                        <Badge variant="outline" className="text-xs">{m.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100 text-base">
              <LayoutDashboard className="h-5 w-5 text-emerald-600" />
                {tSum("quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="default" className="w-full justify-start bg-orange-600 hover:bg-orange-700">
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
