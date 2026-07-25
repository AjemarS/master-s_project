"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Checkbox } from "~/ui/primitives/checkbox";
import { warehouseService } from "./actions";
import type { Warehouse } from "~/lib/types";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  warehouse: Warehouse | null;
  onSuccess: () => void;
}

export function WarehouseDialog({ open, onOpenChange, mode, warehouse, onSuccess }: WarehouseDialogProps) {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  const [name, setName] = useState(mode === "edit" && warehouse ? warehouse.name : "");
  const [type, setType] = useState<"warehouse" | "showroom">(
    mode === "edit" && warehouse ? warehouse.type : "warehouse"
  );
  const [address, setAddress] = useState(mode === "edit" && warehouse ? warehouse.address || "" : "");
  const [isActive, setIsActive] = useState(mode === "edit" && warehouse ? warehouse.is_active : true);
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    if (!saving) onOpenChange(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await warehouseService.create({
          name: name.trim(),
          type,
          address: address.trim(),
          is_active: isActive,
        });
        if (res.error) throw new Error(res.error.message);
        toast.success(t("createWarehouse"), { description: `${name.trim()} — ${t("createDialogDesc")}` });
      } else {
        if (!warehouse) return;
        const res = await warehouseService.update(warehouse.id, {
          name: name.trim(),
          type,
          address: address.trim(),
          is_active: isActive,
        });
        if (res.error) throw new Error(res.error.message);
        toast.success(t("warehouseUpdated"));
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    } finally {
      setSaving(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? t("createDialogTitle") : t("editDialogTitle")}</DialogTitle>
          <DialogDescription>
            {isCreate ? t("createDialogDesc") : t("editDialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-name" className="text-right">{t("name")} *</Label>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-type" className="text-right">{t("type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as "warehouse" | "showroom")}>
              <SelectTrigger id="wh-type" className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                <SelectItem value="showroom">{t("showroom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-address" className="text-right">{t("address")}</Label>
            <Input id="wh-address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wh-active" className="text-right">{t("active")}</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Checkbox id="wh-active" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
              <span className="text-sm text-muted-foreground">{isActive ? tc("yes") : tc("no")}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? tc("saving") : isCreate ? t("createWarehouse") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
