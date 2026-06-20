"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Warehouse, Package, ArrowLeft } from "lucide-react";
import { warehouseApi, stockApi } from "~/lib/api/admin-api";
import type { Warehouse, Stock } from "~/lib/types";
import { TableSkeleton } from "../components";

export function WarehousesClient() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [whRes, stRes] = await Promise.all([warehouseApi.getAll(), stockApi.getAll()]);
        if (whRes.error) throw new Error(whRes.error.message);
        if (stRes.error) throw new Error(stRes.error.message);
        setWarehouses(whRes.data?.results || []);
        setStock(stRes.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              На головну
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Warehouse className="h-10 w-10 text-purple-600" />
                Склади та залишки
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Управління складами та рівнями запасів</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-6">
            <TableSkeleton rows={4} cols={4} />
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="dark:text-slate-100">Склади та шоуруми</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      {warehouses.length} локацій
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Назва</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Тип</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Адреса</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Активний</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <Warehouse className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            Немає складів
                          </td>
                        </tr>
                      ) : (
                        warehouses.map((wh) => (
                          <tr key={wh.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{wh.name}</td>
                            <td className="p-4">
                              <Badge variant={wh.type === "warehouse" ? "default" : "secondary"}>
                                {wh.type === "warehouse" ? "Склад" : "Шоурум"}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{wh.address}</td>
                            <td className="p-4">
                              <Badge variant={wh.is_active ? "default" : "secondary"}>
                                {wh.is_active ? "Так" : "Ні"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Warehouse summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {warehouses.map((wh) => {
                const whStock = stock.filter((s) => s.warehouse_name === wh.name);
                const totalQty = whStock.reduce((sum, s) => sum + s.quantity, 0);
                const totalReserved = whStock.reduce((sum, s) => sum + s.reserved, 0);
                const productCount = whStock.length;
                return (
                  <Card key={wh.id} className="dark:bg-slate-800/80 dark:border-slate-700 border-t-4 border-t-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-purple-600" />
                        {wh.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Товарів</div>
                          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{productCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Всього од.</div>
                          <div className="text-xl font-bold text-blue-600">{totalQty}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Зарезервовано</div>
                          <div className="text-xl font-bold text-orange-600">{totalReserved}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                      <Package className="h-5 w-5 text-purple-600" />
                      Детальні залишки
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Поточні запаси товарів за позиціями
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">ID товару</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Склад</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Кількість</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Зарезервовано</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Доступно</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            Немає залишків
                          </td>
                        </tr>
                      ) : (
                        stock.map((s) => (
                          <tr key={s.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{s.product_id}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{s.warehouse_name}</td>
                            <td className="p-4 text-slate-900 dark:text-slate-200">{s.quantity}</td>
                            <td className="p-4 text-orange-600 dark:text-orange-400">{s.reserved}</td>
                            <td className="p-4 text-green-600 dark:text-green-400 font-semibold">{s.available}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
