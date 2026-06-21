"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, ClipboardList, ArrowLeft, Plus, X } from "lucide-react";
import { goodsReceiptApi, supplierApi, warehouseApi } from "~/lib/api/admin-api";
import type { GoodsReceiptNote, Supplier, Warehouse } from "~/lib/types";
import { TableSkeleton } from "../components";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `${Number(amount).toFixed(2)} ₴`;
}

interface GrnFormItem {
  product_id: string;
  quantity: string;
  cost_price: string;
}

export function GoodsReceiptsClient() {
  const [receipts, setReceipts] = useState<GoodsReceiptNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formSupplier, setFormSupplier] = useState("");
  const [formWarehouse, setFormWarehouse] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formRef, setFormRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<GrnFormItem[]>([
    { product_id: "", quantity: "1", cost_price: "0" },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const [grRes, supRes, whRes] = await Promise.all([
          goodsReceiptApi.getAll(),
          supplierApi.getAll(),
          warehouseApi.getAll(),
        ]);
        if (cancelled) return;
        if (grRes.error) throw new Error(grRes.error.message);
        setReceipts(grRes.data?.results || []);
        setSuppliers(supRes.data?.results || []);
        setWarehouses(whRes.data?.results || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  const addItem = () => {
    setFormItems([...formItems, { product_id: "", quantity: "1", cost_price: "0" }]);
  };

  const removeItem = (i: number) => {
    if (formItems.length > 1) setFormItems(formItems.filter((_, j) => j !== i));
  };

  const updateItem = (i: number, field: keyof GrnFormItem, value: string) => {
    setFormItems(formItems.map((item, j) => (j === i ? { ...item, [field]: value } : item)));
  };

  const handleCreate = async () => {
    if (!formSupplier || !formWarehouse) return;
    const items = formItems
      .filter((item) => item.product_id.trim() !== "")
      .map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10) || 1,
        cost_price: parseFloat(item.cost_price) || 0,
      }));
    if (items.length === 0) return;

    setSaving(true);
    try {
      const res = await goodsReceiptApi.create({
        supplier: parseInt(formSupplier, 10),
        warehouse: parseInt(formWarehouse, 10),
        receipt_date: formDate,
        reference_number: formRef,
        notes: formNotes,
        items,
      } as Partial<GoodsReceiptNote>);
      if (res.error) {
        toast.error("Failed to create goods receipt", { description: res.error.message });
      } else {
        toast.success("Goods receipt created");
        setShowCreate(false);
        setFormSupplier(""); setFormWarehouse(""); setFormRef(""); setFormNotes("");
        setFormItems([{ product_id: "", quantity: "1", cost_price: "0" }]);
        const [grRefetch] = await Promise.all([goodsReceiptApi.getAll(), supplierApi.getAll(), warehouseApi.getAll()]);
        if (!grRefetch.error) setReceipts(grRefetch.data?.results || []);
      }
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

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
                <ClipboardList className="h-10 w-10 text-purple-600" />
                Прибуткові накладні
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Облік оприбуткування товару</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Створити накладну
            </Button>
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
                <CardTitle className="dark:text-slate-100">Список накладних</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {receipts.length > 0 ? `${receipts.length} накладних` : "Немає накладних"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={6} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">№</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Постачальник</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Склад</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дата</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Сума</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Створив</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Немає прибуткових накладних
                        </td>
                      </tr>
                    ) : (
                      receipts.map((r) => (
                        <tr key={r.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{r.id}</td>
                          <td className="p-4 text-slate-900 dark:text-slate-200">{r.supplier_name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{r.warehouse_name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{formatDate(r.receipt_date)}</td>
                          <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(r.total_amount)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{r.created_by}</td>
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

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Створити прибуткову накладну</DialogTitle>
            <DialogDescription>Оприбуткуйте товар від постачальника.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Постачальник *</Label>
              <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Оберіть...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Склад *</Label>
              <select value={formWarehouse} onChange={(e) => setFormWarehouse(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Оберіть...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Дата</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Номер</Label>
              <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="Накладна №" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Нотатки</Label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                className="col-span-3 flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
            </div>

            <div className="col-span-4 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Позиції</Label>
                <Button variant="outline" size="sm" onClick={addItem} type="button"><Plus className="h-4 w-4 mr-1" /> Додати</Button>
              </div>
              {formItems.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <div className="flex-1">
                    <Label className="text-xs">ID товару</Label>
                    <Input value={item.product_id} onChange={(e) => updateItem(i, "product_id", e.target.value)} placeholder="ID" />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">К-сть</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Ціна</Label>
                    <Input type="number" step="0.01" min="0" value={item.cost_price} onChange={(e) => updateItem(i, "cost_price", e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="mt-5 shrink-0" type="button" disabled={formItems.length <= 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Скасувати</Button>
            <Button onClick={handleCreate} disabled={saving || !formSupplier || !formWarehouse}>
              {saving ? "Створення..." : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
