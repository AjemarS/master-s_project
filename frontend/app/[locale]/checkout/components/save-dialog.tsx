"use client";

import { Loader2 } from "lucide-react";
import { Label } from "~/ui/primitives/label";
import { Button } from "~/ui/primitives/button";
import { Checkbox } from "~/ui/primitives/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/ui/primitives/dialog";

interface SaveDialogProps {
  open: boolean;
  saveNamePhone: boolean;
  saveAddress: boolean;
  onNamePhoneChange: (v: boolean) => void;
  onAddressChange: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onSkip: () => void;
  tChk: (key: string) => string;
}

export function SaveDialog({
  open,
  saveNamePhone,
  saveAddress,
  onNamePhoneChange,
  onAddressChange,
  saving,
  onSave,
  onSkip,
  tChk,
}: SaveDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tChk("saveTitle")}</DialogTitle>
          <DialogDescription>{tChk("saveDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="co-save-name"
              checked={saveNamePhone}
              onCheckedChange={(v) => onNamePhoneChange(v === true)}
            />
            <Label htmlFor="co-save-name" className="cursor-pointer">
              {tChk("saveNamePhone")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="co-save-address"
              checked={saveAddress}
              onCheckedChange={(v) => onAddressChange(v === true)}
            />
            <Label htmlFor="co-save-address" className="cursor-pointer">
              {tChk("saveAddress")}
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip} disabled={saving}>
            {tChk("skipButton")}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tChk("saving")}
              </>
            ) : (
              tChk("saveButton")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
