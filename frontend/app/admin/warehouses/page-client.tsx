"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Warehouse, Package } from "lucide-react";
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

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Склади та шоуруми
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Назва</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Тип</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Адреса</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Активний</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-500">
                      <Warehouse className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      Немає складів
                    </td>
                  </tr>
                ) : (
                  warehouses.map((wh) => (
                    <tr key={wh.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{wh.name}</td>
                      <td className="p-4">
                        <Badge variant={wh.type === "warehouse" ? "default" : "secondary"}>
                          {wh.type === "warehouse" ? "Склад" : "Шоурум"}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-600">{wh.address}</td>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Залишки на складах
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">ID товару</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Склад</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Кількість</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Зарезервовано</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Доступно</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      Немає залишків
                    </td>
                  </tr>
                ) : (
                  stock.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">#{s.product_id}</td>
                      <td className="p-4">{s.warehouse_name}</td>
                      <td className="p-4">{s.quantity}</td>
                      <td className="p-4 text-orange-600">{s.reserved}</td>
                      <td className="p-4 text-green-600 font-semibold">{s.available}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
