"use client";

import { useTranslations } from "next-intl";
import { useState, useRef, useEffect, useMemo, startTransition } from "react";
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
import { Warehouse as WarehouseIcon, Package, Plus, ArrowRightLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import { AdminPageHeader, ConfirmDialog } from "../components";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse, useStock, useTransferStock, useProducts } from "~/lib/hooks/use-api-data";
import type { Warehouse, Stock, Product } from "~/lib/types";
import { useCurrentUser } from "~/lib/auth-client";
import { productApi, stockApi } from "~/lib/api/admin-api";
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
  const { data: stData, error: stError, isLoading: stLoading, mutate: stMutate } = useStock({ pageSize: 250 });
  const { trigger: createWarehouse, isMutating: saving } = useCreateWarehouse();
  const { trigger: updateWarehouse, isMutating: updating } = useUpdateWarehouse();
  const { trigger: deleteWarehouse, isMutating: deleting } = useDeleteWarehouse();
  const { trigger: transferStock, isMutating: transferSaving } = useTransferStock();
  const { data: productsData } = useProducts({ pageSize: 1000 });

  const warehouses: Warehouse[] = whData?.results ?? [];
  const stock: Stock[] = stData ?? [];
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
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stockedWarehouseIds, setStockedWarehouseIds] = useState<Set<number> | null>(null);
  const stockedLoading = !!transferProductId && stockedWarehouseIds === null;
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
  const [stockDialogWh, setStockDialogWh] = useState<Warehouse | null>(null);

  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    productsData?.results?.forEach(p => map.set(p.id, p.name));
    return map;
  }, [productsData]);

  useEffect(() => {
    if (productSearch.length < 2) {
      startTransition(() => setProductResults([]));
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    let cancelled = false;
    searchTimeoutRef.current = setTimeout(async () => {
      const idMatch = productSearch.match(/^#(\d+)$/);
      if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        startTransition(() => setSearching(true));
        try {
          const res = await productApi.getById(id);
          if (cancelled) return;
          startTransition(() => setProductResults(res.data ? [res.data] : []));
        } catch {
          if (!cancelled) startTransition(() => setProductResults([]));
        }
        if (!cancelled) setSearching(false);
        return;
      }

      startTransition(() => setSearching(true));
      startTransition(() => setProductResults([]));
      try {
        const res = await productApi.getAll({ search: productSearch, pageSize: 10 });
        if (cancelled) return;
        if (!res.error && res.data?.results) {
          const results = res.data.results;
          startTransition(() => setProductResults(results));
        }
      } catch { /* ignore */ }
      if (!cancelled) setSearching(false);
    }, 150);
    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [productSearch]);

  // Feature 1: When product selected, find which warehouses stock it
  useEffect(() => {
    if (!transferProductId) return;
    let cancelled = false;
    startTransition(() => setStockedWarehouseIds(null));
    stockApi.getAll({ product_id: parseInt(transferProductId) })
      .then(res => {
        if (cancelled) return;
        const ids = new Set(res.data?.map(s => s.warehouse) ?? []);
        startTransition(() => {
          setStockedWarehouseIds(ids);
          // Reset from-warehouse if it's no longer in the filtered set
          if (transferFromWh && !ids.has(parseInt(transferFromWh))) {
            setTransferFromWh("");
          }
        });
      })
      .catch(() => { if (!cancelled) startTransition(() => setStockedWarehouseIds(new Set())); });
    return () => { cancelled = true; };
  }, [transferProductId]);

  // Feature 2: When both product and from-warehouse selected, prefill quantity
  useEffect(() => {
    if (!transferProductId || !transferFromWh) {
      return;
    }
    let cancelled = false;
    stockApi.getAll({
      product_id: parseInt(transferProductId),
      warehouse_id: parseInt(transferFromWh),
    }).then(res => {
      if (cancelled) return;
      const stockRecord = res.data?.[0];
      if (stockRecord) {
        setTransferQuantity(String(stockRecord.quantity));
        setAvailableQuantity(stockRecord.quantity);
      } else {
        setTransferQuantity("1");
        setAvailableQuantity(null);
      }
    });
    return () => { cancelled = true; };
  }, [transferProductId, transferFromWh]);

  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<"warehouse" | "showroom">("warehouse");
  const [editActive, setEditActive] = useState(true);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

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

  const openEdit = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setEditName(wh.name);
    setEditAddress(wh.address || "");
    setEditType(wh.type);
    setEditActive(wh.is_active);
  };

  const handleEdit = async () => {
    if (!editingWarehouse || !editName.trim()) return;
    try {
      await updateWarehouse({
        id: editingWarehouse.id,
        data: {
          name: editName.trim(),
          type: editType,
          address: editAddress.trim(),
          is_active: editActive,
        },
      });
      toast.success(t("warehouseUpdated"));
      setEditingWarehouse(null);
      whMutate();
      stMutate();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteWarehouse(deleteConfirmId);
      toast.success(t("warehouseDeleted"));
      setDeleteConfirmId(null);
      whMutate();
      stMutate();
    } catch (err) {
      toast.error(t("deleteError"), { description: err instanceof Error ? err.message : tc("error") });
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
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={WarehouseIcon}
          backLabel={tc("back")}
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
            <Card className="dark:bg-card dark:border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">{t("overview")}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {tc("count", { count: warehouses.length })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
          <div className="border rounded-lg dark:border-border max-h-[60vh] overflow-y-auto pr-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 border-b dark:border-border">
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead>{t("address")}</TableHead>
                        <TableHead>{t("active")}</TableHead>
                        {isAdmin && <TableHead className="text-right">{tc("actions")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses.length === 0 ? (
                        <EmptyState icon={WarehouseIcon} message={t("noWarehouses")} colSpan={isAdmin ? 5 : 4} />
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
                            {isAdmin && (
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEdit(wh)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmId(wh.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
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
                  <Card key={wh.id} className="dark:bg-card dark:border-border border-t-4 border-t-primary cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setStockDialogWh(wh)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <WarehouseIcon className="h-4 w-4 text-primary" />
                        {wh.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">{t("productCount")}</div>
                          <div className="text-3xl font-bold text-foreground">{productCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t("totalQty")}</div>
                          <div className="text-3xl font-bold text-primary">{totalQty}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t("reserved")}</div>
                          <div className="text-3xl font-bold text-accent-electric">{totalReserved}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>


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
              <Label htmlFor="wh-name" className="text-right">{t("name")} *</Label>
              <Input id="wh-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-type" className="text-right">{t("type")}</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as "warehouse" | "showroom")}>
                <SelectTrigger id="wh-type" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                  <SelectItem value="showroom">{t("showroom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-address" className="text-right">{t("address")}</Label>
              <Input id="wh-address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-active" className="text-right">{t("active")}</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox id="wh-active" checked={formActive} onCheckedChange={(c) => setFormActive(c === true)} />
                <span className="text-sm text-muted-foreground">{formActive ? tc("yes") : tc("no")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? tc("saving") : t("createWarehouse")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingWarehouse} onOpenChange={(o) => { if (!o) setEditingWarehouse(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-edit-name" className="text-right">{t("name")} *</Label>
              <Input id="wh-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-edit-type" className="text-right">{t("type")}</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as "warehouse" | "showroom")}>
                <SelectTrigger id="wh-edit-type" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                  <SelectItem value="showroom">{t("showroom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-edit-address" className="text-right">{t("address")}</Label>
              <Input id="wh-edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-edit-active" className="text-right">{t("active")}</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox id="wh-edit-active" checked={editActive} onCheckedChange={(c) => setEditActive(c === true)} />
                <span className="text-sm text-muted-foreground">{editActive ? tc("yes") : tc("no")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWarehouse(null)} disabled={updating}>{tc("cancel")}</Button>
            <Button onClick={handleEdit} disabled={updating || !editName.trim()}>
              {updating ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        onConfirm={handleDelete}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmText={tc("delete")}
        cancelText={tc("cancel")}
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={showTransfer} onOpenChange={(o) => { if (!o) setShowTransfer(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transferDialogTitle")}</DialogTitle>
            <DialogDescription>{t("transferDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-transfer-product" className="text-right">{t("productId")} *</Label>
              <div className="col-span-3 relative">
                <Input
                  id="wh-transfer-product"
                  placeholder={tc("searchProducts")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {searching && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {productSearch.length >= 2 && productResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-background dark:bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {productResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                        onClick={() => {
                          setProductSearch(`${p.name} (#${p.id})`);
                          setTransferProductId(String(p.id));
                          setProductResults([]);
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-2">#{p.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-transfer-from" className="text-right">{t("fromWarehouse")} *</Label>
              <div className="col-span-3">
                <Select value={transferFromWh} onValueChange={setTransferFromWh}>
                  <SelectTrigger id="wh-transfer-from">
                    <SelectValue placeholder={stockedLoading ? "Loading…" : t("fromWarehouse")} />
                    {stockedLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => !stockedWarehouseIds || stockedWarehouseIds.size === 0 || stockedWarehouseIds.has(w.id))
                      .map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {transferProductId && stockedWarehouseIds && stockedWarehouseIds.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stockedWarehouseIds.size} warehouse{stockedWarehouseIds.size !== 1 ? "s" : ""} have this product in stock
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-transfer-to" className="text-right">{t("toWarehouse")} *</Label>
              <Select value={transferToWh} onValueChange={setTransferToWh}>
                <SelectTrigger id="wh-transfer-to" className="col-span-3"><SelectValue placeholder={t("toWarehouse")} /></SelectTrigger>
                <SelectContent>
                  {warehouses.filter((w) => String(w.id) !== transferFromWh).map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-transfer-qty" className="text-right">{t("qty")} *</Label>
              <Input id="wh-transfer-qty" type="number" min="1" value={transferQuantity} onChange={(e) => setTransferQuantity(e.target.value)}
                className="col-span-3" />
              {availableQuantity !== null && (
                <p className="text-xs text-muted-foreground col-span-4 text-right">
                  {t("available")}: {availableQuantity}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wh-transfer-notes" className="text-right">{t("notes")}</Label>
              <Input id="wh-transfer-notes" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} className="col-span-3"
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

      {/* Warehouse Stock Dialog */}
      <Dialog open={!!stockDialogWh} onOpenChange={(o) => { if (!o) setStockDialogWh(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {stockDialogWh?.name} — {t("stockDetails")}
            </DialogTitle>
            <DialogDescription>{t("stockDetailsDesc")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[55vh] -mx-6 px-6">
            <div className="border rounded-lg dark:border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b dark:border-border">
                    <TableHead>{t("productId")}</TableHead>
                    <TableHead>{t("qty")}</TableHead>
                    <TableHead>{t("reserved")}</TableHead>
                    <TableHead>{t("available")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const whStock = stockDialogWh
                      ? stock.filter(s => s.warehouse === stockDialogWh.id && s.quantity > 0)
                      : [];
                    return whStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          {t("noStock")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      whStock.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <span className="font-medium">{productNames.get(s.product_id) || `#${s.product_id}`}</span>
                            <span className="text-xs text-muted-foreground ml-2">#{s.product_id}</span>
                          </TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell className="text-accent-electric">{s.reserved}</TableCell>
                          <TableCell className="text-primary font-semibold">{s.available}</TableCell>
                        </TableRow>
                      ))
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogWh(null)}>{tc("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
