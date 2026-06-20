"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Truck } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Постачальники
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Назва</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Контактна особа</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Телефон</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Активний</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    Немає постачальників
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4">{s.contact_person}</td>
                    <td className="p-4">{s.phone}</td>
                    <td className="p-4 text-blue-600">{s.email}</td>
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
      </CardContent>
    </Card>
  );
}
