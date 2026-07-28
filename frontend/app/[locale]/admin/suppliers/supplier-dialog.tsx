"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import { Separator } from "~/ui/primitives/separator";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Building2, User, Phone, Mail, MapPin } from "lucide-react";
import { supplierService } from "./actions";
import type { Supplier } from "~/lib/types";
import { useActivityFeed } from "../components/activity-feed";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  supplier: Supplier | null;
  onSuccess: () => void;
}

export function SupplierDialog({
  open, onOpenChange, mode, supplier, onSuccess,
}: SupplierDialogProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const [name, setName] = useState(mode === "edit" && supplier ? supplier.name : "");
  const [contact, setContact] = useState(mode === "edit" && supplier ? supplier.contact_person : "");
  const [phone, setPhone] = useState(mode === "edit" && supplier ? supplier.phone : "");
  const [email, setEmail] = useState(mode === "edit" && supplier ? supplier.email : "");
  const [address, setAddress] = useState(mode === "edit" && supplier ? supplier.address : "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { pushEvent } = useActivityFeed();

  const resetAndClose = useCallback(() => {
    setFormError(null);
    setSaving(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError(tc("required"));
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Invalid email format.");
      return;
    }
    setFormError(null);
    setSaving(true);

    try {
      const payload: Partial<Supplier> = {
        name: name.trim(),
        contact_person: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      };
      const res = mode === "create"
        ? await supplierService.create(payload)
        : await supplierService.update(supplier!.id!, payload);

      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(mode === "create" ? t("createDialogTitle") : t("supplierUpdated"));
        pushEvent({ type: mode === "create" ? "create" : "update", message: `${mode === "create" ? "Created" : "Updated"} supplier "${name.trim()}"`, entityType: "supplier" });
        resetAndClose();
        onSuccess();
      }
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : tc("error"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {mode === "create" ? t("createDialogTitle") : t("editDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("createDialogDesc") : t("editDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-name" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {t("name")} *
              </Label>
              <Input
                id="sup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-contact" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {t("contactPerson")}
              </Label>
              <Input
                id="sup-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-phone" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {t("phone")}
              </Label>
              <Input
                id="sup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-email" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {t("email")}
              </Label>
              <Input
                id="sup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-address" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {t("address")}
              </Label>
              <Input
                id="sup-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>

          {formError && (
            <Alert variant="destructive" className="mt-4 mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
        </motion.div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={saving}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving
              ? tc("saving")
              : mode === "create"
                ? tc("create")
                : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
