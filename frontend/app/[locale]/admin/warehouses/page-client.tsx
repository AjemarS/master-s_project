"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Warehouse as WarehouseIcon, Package, ArrowLeft, Plus, ArrowRightLeft } from "lucide-react";
import { useWarehouses, useCreateWarehouse, useStock, useTransferStock } from "~/lib/hooks/use-api-data";
import type { Warehouse, Stock } from "~/lib/types";
import { TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";

export function WarehousesClient() {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  const { data: whData, error: whError, isLoading: whLoading, mutate: whMutate } = useWarehouses();
  const { data: stData, error: stError, isLoading: stLoading, mutate: stMutate } = useStock();
  const { trigger: createWarehouse, isMutating: saving } = useCreateWarehouse();
  const { trigger: transferStock, isMutating: transferSaving } = useTransferStock();

  const warehouses: Warehouse[] = whData?.results ?? [];
  const stock: Stock[] = stData?.results ?? [];
  const error = whError || stError || null;
  const loading = whLoading || stLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"warehouse" | "showroom">("warehouse");
  const [formAddress, setFormAddress] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [transferProductId, setTransferProductId] = useState("");
  const [transferFromWh, setTransferFromWh] = useState("");
  const [transferToWh, setTransferToWh] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("1");
  const [transferNotes, setTransferNotes] = useState("");

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      await createWarehouse({
        name: formName.trim(),
        type: formType,
        address: formAddress.trim(),
        is_active: formActive,
      });
      toast.success(t("createWarehouse"), { description: `${formName.trim()} — ${t("createDialogDesc")}` });
      setShowCreate(false);
      setFormName(""); setFormType("warehouse"); setFormAddress(""); setFormActive(true);
      whMutate();
      stMutate();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  const handleTransfer = async () => {
    const pid = parseInt(transferProductId, 10);
    const from = parseInt(transferFromWh, 10);
    const to = parseInt(transferToWh, 10);
    const qty = parseInt(transferQuantity, 10);
    if (isNaN(pid) || isNaN(from) || isNaN(to) || isNaN(qty) || qty <= 0 || from === to) {
      toast.error(tc("error"), { description: tc("noData") });
      return;
    }
    try {
      await transferStock({
        product_id: pid, from_warehouse_id: from, to_warehouse_id: to,
        quantity: qty, notes: transferNotes || undefined,
      });
      toast.success(t("transferStock"), { description: `#${pid} — ${qty} ${t("qty")}` });
      setShowTransfer(false);
      setTransferProductId(""); setTransferFromWh(""); setTransferToWh("");
      setTransferQuantity("1"); setTransferNotes("");
      stMutate();
      whMutate();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tc("backToStore")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <WarehouseIcon className="h-10 w-10 text-purple-600" />
                {t("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowTransfer(true)} className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" /> {t("transferStock")}
              </Button>
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> {t("createWarehouse")}
              </Button>
            </div>
          </div>
        </div>

        <ErrorAlert message={error?.message || null} />

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
                    <CardTitle className="dark:text-slate-100">{t("overview")}</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      {tc("count", { count: warehouses.length })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("name")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("type")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("address")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("active")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <WarehouseIcon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            {t("noWarehouses")}
                          </td>
                        </tr>
                      ) : (
                        warehouses.map((wh) => (
                          <tr key={wh.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{wh.name}</td>
                            <td className="p-4">
                              <Badge variant={wh.type === "warehouse" ? "default" : "secondary"}>
                                {wh.type === "warehouse" ? t("warehouse") : t("showroom")}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{wh.address}</td>
                            <td className="p-4">
                              <Badge variant={wh.is_active ? "default" : "secondary"}>
                                {wh.is_active ? tc("yes") : tc("no")}
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
                        <WarehouseIcon className="h-4 w-4 text-purple-600" />
                        {wh.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t("productCount")}</div>
                          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{productCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t("totalQty")}</div>
                          <div className="text-xl font-bold text-blue-600">{totalQty}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t("reserved")}</div>
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
                      {t("stockDetails")}
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      {t("stockDetailsDesc")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("productId")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("warehouse")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("qty")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("reserved")}</th>
                        <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("available")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            {t("noStock")}
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

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("name")} *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("type")}</Label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as "warehouse" | "showroom")}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="warehouse">{t("warehouse")}</option>
                <option value="showroom">{t("showroom")}</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("address")}</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("active")}</Label>
              <div className="col-span-3 flex items-center gap-2">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm text-slate-600">{formActive ? tc("yes") : tc("no")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? t("createWarehouse") : t("createWarehouse")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransfer} onOpenChange={(o) => { if (!o) setShowTransfer(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transferDialogTitle")}</DialogTitle>
            <DialogDescription>{t("transferDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("productId")} *</Label>
              <Input type="number" min="1" value={transferProductId} onChange={(e) => setTransferProductId(e.target.value)}
                className="col-span-3" placeholder={t("productId")} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("fromWarehouse")} *</Label>
              <select value={transferFromWh} onChange={(e) => setTransferFromWh(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">{t("fromWarehouse")}...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("toWarehouse")} *</Label>
              <select value={transferToWh} onChange={(e) => setTransferToWh(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">{t("toWarehouse")}...</option>
                {warehouses.filter((w) => String(w.id) !== transferFromWh).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("qty")} *</Label>
              <Input type="number" min="1" value={transferQuantity} onChange={(e) => setTransferQuantity(e.target.value)}
                className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("notes")}</Label>
              <Input value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} className="col-span-3"
                placeholder={t("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)} disabled={transferSaving}>{tc("cancel")}</Button>
            <Button onClick={handleTransfer} disabled={transferSaving || !transferProductId || !transferFromWh || !transferToWh}>
              {transferSaving ? t("transferring") : t("transferStock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
