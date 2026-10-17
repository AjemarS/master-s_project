"use client";

import { Label } from "~/ui/primitives/label";
import { Checkbox } from "~/ui/primitives/checkbox";

interface SaveDetailsProps {
  saveNamePhone: boolean;
  saveAddress: boolean;
  onNamePhoneChange: (v: boolean) => void;
  onAddressChange: (v: boolean) => void;
  tChk: (key: string) => string;
}

// Asked inline before payment, not in a modal after it: nothing may stand between "pay" and the Stripe redirect
export function SaveDetails({
  saveNamePhone,
  saveAddress,
  onNamePhoneChange,
  onAddressChange,
  tChk,
}: SaveDetailsProps) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{tChk("saveDescription")}</legend>
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
    </fieldset>
  );
}
