"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, ArrowLeft, ArrowRightLeft, Filter, X } from "lucide-react";
import { stockMovementApi, warehouseApi } from "~/lib/api/admin-api";
import type { StockMovement, Warehouse } from "~/lib/types";
import { TableSkeleton } from "../components";

const MOVEMENT_TYPES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  receipt: { label: "Оприбуткування", variant: "default" },
  transfer: { label: "Переміщення", variant: "secondary" },
  sale: { label: "Продаж", variant: "outline" },
  adjustment: { label: "Коригування", variant: "outline" },
  write_off: { label: "Списання", variant: "destructive" },
  reserve: { label: "Резерв", variant: "outline" },
  release: { label: "Знято резерв", variant: "outline" },
  deduct: { label: "Відвантажено", variant: "default" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function StockMovementsClient() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterFromWarehouse, setFilterFromWarehouse] = useState("");
  const [filterToWarehouse, setFilterToWarehouse] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchMovements = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await stockMovementApi.getAll({
        page,
        type: filterType || undefined,
        product_id: filterProductId ? parseInt(filterProductId, 10) : undefined,
        from_warehouse_id: filterFromWarehouse ? parseInt(filterFromWarehouse, 10) : undefined,
        to_warehouse_id: filterToWarehouse ? parseInt(filterToWarehouse, 10) : undefined,
        created_after: filterDateFrom || undefined,
        created_before: filterDateTo || undefined,
      });
      if (res.error) throw new Error(res.error.message);
      setMovements(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити журнал руху");
    } finally {
      setLoading(false);
    }
    }, [filterType, filterProductId, filterFromWarehouse, filterToWarehouse, filterDateFrom, filterDateTo]);

  useEffect(() => {
    queueMicrotask(() => fetchMovements(1));
    warehouseApi.getAll().then((res) => {
      if (res.data?.results) setWarehouses(res.data.results);
    });
  }, [fetchMovements]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> На головну
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <ArrowRightLeft className="h-10 w-10 text-purple-600" />
              Журнал руху товарів
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Аудит усіх операцій з товарами на складах</p>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">Рух товарів</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {totalCount > 0 ? `${totalCount} записів` : "Немає записів"}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                {showFilters ? "Закрити" : "Фільтр"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Тип</Label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Всі типи</option>
                      {Object.entries(MOVEMENT_TYPES).map(([val, info]) => (
                        <option key={val} value={val}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">ID товару</Label>
                    <Input
                      type="number"
                      placeholder="ID"
                      value={filterProductId}
                      onChange={(e) => setFilterProductId(e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Зі складу</Label>
                    <select
                      value={filterFromWarehouse}
                      onChange={(e) => setFilterFromWarehouse(e.target.value)}
                      className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Всі</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">На склад</Label>
                    <select
                      value={filterToWarehouse}
                      onChange={(e) => setFilterToWarehouse(e.target.value)}
                      className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Всі</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Дата від</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Дата до</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-40" />
                  </div>
                  <Button size="sm" onClick={() => fetchMovements(1)}>
                    Застосувати
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setFilterType(""); setFilterProductId("");
                    setFilterFromWarehouse(""); setFilterToWarehouse("");
                    setFilterDateFrom(""); setFilterDateTo("");
                  }}>
                    Скинути
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <TableSkeleton rows={8} cols={8} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">ID</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Тип</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Товар ID</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Звідки</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Куди</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Кількість</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дата</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Користувач</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Журнал руху порожній
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const typeInfo = MOVEMENT_TYPES[m.type] || { label: m.type, variant: "outline" as const };
                        return (
                          <tr key={m.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{m.id}</td>
                            <td className="p-4">
                              <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                            </td>
                            <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-400">#{m.product_id}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">
                              {m.from_warehouse_name || "—"}
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">
                              {m.to_warehouse_name || "—"}
                            </td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{m.quantity}</td>
                            <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(m.created_at)}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{m.created_by || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalCount > 20 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Сторінка {currentPage} з {Math.ceil(totalCount / 20)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1 || loading} onClick={() => fetchMovements(currentPage - 1)}>
                Попередня
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(totalCount / 20) || loading} onClick={() => fetchMovements(currentPage + 1)}>
                Наступна
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
