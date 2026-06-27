"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Checkbox } from "~/ui/primitives/checkbox";
import { Warehouse as WarehouseIcon, Package, Plus, ArrowRightLeft } from "lucide-react";
import { AdminPageHeader } from "../components";
import { useWarehouses, useCreateWarehouse, useStock, useTransferStock } from "~/lib/hooks/use-api-data";
import type { Warehouse, Stock } from "~/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from "../components";
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
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={WarehouseIcon}
          backLabel={tc("backToStore")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowTransfer(true)} className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" /> {t("transferStock")}
              </Button>
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> {t("createWarehouse")}
              </Button>
            </div>
          }
        />

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
                <div className="border rounded-lg dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead>{t("address")}</TableHead>
                        <TableHead>{t("active")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses.length === 0 ? (
                        <EmptyState icon={WarehouseIcon} message={t("noWarehouses")} colSpan={4} />
                      ) : (
                        warehouses.map((wh) => (
                          <TableRow key={wh.id}>
                            <TableCell className="font-medium">{wh.name}</TableCell>
                            <TableCell>
                              <Badge variant={wh.type === "warehouse" ? "default" : "secondary"}>
                                {wh.type === "warehouse" ? t("warehouse") : t("showroom")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{wh.address}</TableCell>
                            <TableCell>
                              <Badge variant={wh.is_active ? "default" : "secondary"}>
                                {wh.is_active ? tc("yes") : tc("no")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
                <div className="border rounded-lg dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <TableHead>{t("productId")}</TableHead>
                        <TableHead>{t("warehouse")}</TableHead>
                        <TableHead>{t("qty")}</TableHead>
                        <TableHead>{t("reserved")}</TableHead>
                        <TableHead>{t("available")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stock.length === 0 ? (
                        <EmptyState icon={Package} message={t("noStock")} colSpan={5} />
                      ) : (
                        stock.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">#{s.product_id}</TableCell>
                            <TableCell className="text-muted-foreground">{s.warehouse_name}</TableCell>
                            <TableCell>{s.quantity}</TableCell>
                            <TableCell className="text-orange-600 dark:text-orange-400">{s.reserved}</TableCell>
                            <TableCell className="text-green-600 dark:text-green-400 font-semibold">{s.available}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
              <Select value={formType} onValueChange={(v) => setFormType(v as "warehouse" | "showroom")}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                  <SelectItem value="showroom">{t("showroom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("address")}</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("active")}</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox checked={formActive} onCheckedChange={(c) => setFormActive(c === true)} />
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
              <Select value={transferFromWh} onValueChange={setTransferFromWh}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder={t("fromWarehouse")} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("toWarehouse")} *</Label>
              <Select value={transferToWh} onValueChange={setTransferToWh}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder={t("toWarehouse")} /></SelectTrigger>
                <SelectContent>
                  {warehouses.filter((w) => String(w.id) !== transferFromWh).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
