"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Truck, ArrowLeft } from "lucide-react";
import { supplierApi } from "~/lib/api/admin-api";
import type { Supplier } from "~/lib/types";
import { TableSkeleton } from "../components";

export function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await supplierApi.getAll();
        if (res.error) throw new Error(res.error.message);
        setSuppliers(res.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load suppliers");
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
                <Truck className="h-10 w-10 text-purple-600" />
                Постачальники
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Управління постачальниками</p>
            </div>
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
                <CardTitle className="dark:text-slate-100">Список постачальників</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {suppliers.length > 0 ? `${suppliers.length} постачальників` : "Немає постачальників"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Назва</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Контактна особа</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Телефон</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Активний</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Немає постачальників
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.contact_person}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.phone}</td>
                          <td className="p-4 text-blue-600 dark:text-blue-400">{s.email}</td>
                          <td className="p-4">
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? "Так" : "Ні"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
