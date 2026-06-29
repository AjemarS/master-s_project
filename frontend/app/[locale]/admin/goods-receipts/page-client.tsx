"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Textarea } from "~/ui/primitives/textarea";
import { ClipboardList, Plus, X } from "lucide-react";
import { AdminPageHeader } from "../components";
import { formatCurrency } from "~/lib/utils/format";
import { useGoodsReceipts, useCreateGoodsReceipt, useSuppliers, useWarehouses } from "~/lib/hooks/use-api-data";
import { ErrorAlert } from "~/ui/components/error-alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from "../components";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

interface GrnFormItem {
  product_id: string;
  quantity: string;
  cost_price: string;
}

export function GoodsReceiptsClient() {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  const { data: grData, error: grError, isLoading: grLoading, mutate: grMutate } = useGoodsReceipts();
  const { data: supData } = useSuppliers();
  const { data: whData } = useWarehouses();
  const { trigger: createGrn, isMutating: saving } = useCreateGoodsReceipt();

  const receipts = grData?.results || [];
  const suppliers = supData?.results || [];
  const warehouses = whData?.results || [];

  const [showCreate, setShowCreate] = useState(false);

  const [formSupplier, setFormSupplier] = useState("");
  const [formWarehouse, setFormWarehouse] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formRef, setFormRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<GrnFormItem[]>([
    { product_id: "", quantity: "1", cost_price: "0" },
  ]);

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

    try {
      await createGrn({
        supplier: parseInt(formSupplier, 10),
        warehouse: parseInt(formWarehouse, 10),
        receipt_date: formDate,
        reference_number: formRef,
        notes: formNotes,
        items,
      });
      toast.success(t("createGrn"));
      setShowCreate(false);
      setFormSupplier(""); setFormWarehouse(""); setFormRef(""); setFormNotes("");
      setFormItems([{ product_id: "", quantity: "1", cost_price: "0" }]);
      grMutate();
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
          icon={ClipboardList}
          backLabel={tc("back")}
          actions={
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("createGrn")}
            </Button>
          }
        />

        <ErrorAlert message={grError?.message || null} />

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">{t("title")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {receipts.length > 0 ? tc("count", { count: receipts.length }) : t("noReceipts")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {grLoading ? (
              <TableSkeleton rows={4} cols={6} />
            ) : (
              <div className="border rounded-lg dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <TableHead>{t("id")}</TableHead>
                      <TableHead>{t("supplier")}</TableHead>
                      <TableHead>{t("warehouse")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("amount")}</TableHead>
                      <TableHead>{t("createdBy")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.length === 0 ? (
                      <EmptyState icon={ClipboardList} message={t("noReceipts")} colSpan={6} />
                    ) : (
                      receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">#{r.id}</TableCell>
                          <TableCell>{r.supplier_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.warehouse_name}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(r.receipt_date)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.created_by}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("supplier")} *</Label>
              <div className="col-span-3">
                <Select value={formSupplier} onValueChange={setFormSupplier}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t("selectSupplier")} /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("warehouse")} *</Label>
              <div className="col-span-3">
                <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t("selectWarehouse")} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("date")}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("refNumber")}</Label>
              <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder={t("refPlaceholder")} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">{tc("notes")}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="col-span-3" />
            </div>

            <div className="col-span-4 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">{t("positions")}</Label>
                <Button variant="outline" size="sm" onClick={addItem} type="button"><Plus className="h-4 w-4 mr-1" /> {t("addItem")}</Button>
              </div>
              {formItems.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <div className="flex-1">
                    <Label className="text-xs">{t("productId")}</Label>
                    <Input value={item.product_id} onChange={(e) => updateItem(i, "product_id", e.target.value)} placeholder={t("productId")} />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">{t("qty")}</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">{t("costPrice")}</Label>
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
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !formSupplier || !formWarehouse}>
              {saving ? tc("create") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
