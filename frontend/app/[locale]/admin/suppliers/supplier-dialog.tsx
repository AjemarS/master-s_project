"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle } from "lucide-react";
import type { Supplier } from "~/lib/types";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  supplier: Supplier | null;
  onSave: (data: Partial<Supplier>) => Promise<void>;
  saving: boolean;
  formError: string | null;
}

export function SupplierDialog({
  open,
  onOpenChange,
  mode,
  supplier,
  onSave,
  saving,
  formError,
}: SupplierDialogProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const [name, setName] = useState(
    mode === "edit" && supplier ? supplier.name : ""
  );
  const [contact, setContact] = useState(
    mode === "edit" && supplier ? supplier.contact_person : ""
  );
  const [phone, setPhone] = useState(
    mode === "edit" && supplier ? supplier.phone : ""
  );
  const [email, setEmail] = useState(
    mode === "edit" && supplier ? supplier.email : ""
  );
  const [address, setAddress] = useState(
    mode === "edit" && supplier ? supplier.address : ""
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || formError;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setLocalError(tc("required"));
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError("Invalid email format.");
      return;
    }
    setLocalError(null);
    await onSave({
      name: name.trim(),
      contact_person: contact.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    });
  };

  const resetAndClose = () => {
    setLocalError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createDialogTitle") : t("editDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("createDialogDesc") : t("editDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sup-name" className="text-right pr-2">
              {t("name")} *
            </Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sup-contact" className="text-left pr-2">
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
            <Label htmlFor="sup-phone" className="text-right pr-2">
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
            <Label htmlFor="sup-email" className="text-right pr-2">
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
            <Label htmlFor="sup-address" className="text-right pr-2">
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

        {displayError && (
          <Alert variant="destructive" className="mb-2 mx-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

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
