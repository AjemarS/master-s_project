"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, ClipboardList } from "lucide-react";
import { goodsReceiptApi } from "~/lib/api/admin-api";
import type { GoodsReceiptNote } from "~/lib/types";
import { TableSkeleton } from "../components";

export function GoodsReceiptsClient() {
  const [receipts, setReceipts] = useState<GoodsReceiptNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await goodsReceiptApi.getAll();
        if (res.error) throw new Error(res.error.message);
        setReceipts(res.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goods receipts");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <TableSkeleton rows={4} cols={6} />;

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
          <ClipboardList className="h-5 w-5" />
          Прибуткові накладні
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">№</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Постачальник</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Склад</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Дата надходження</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Сума</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Створив</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    Немає прибуткових накладних
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium">#{r.id}</td>
                    <td className="p-4">{r.supplier_name}</td>
                    <td className="p-4">{r.warehouse_name}</td>
                    <td className="p-4">{new Date(r.receipt_date).toLocaleDateString("uk-UA")}</td>
                    <td className="p-4 font-semibold">{Number(r.total_amount).toFixed(2)} ₴</td>
                    <td className="p-4 text-slate-600">{r.created_by}</td>
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
