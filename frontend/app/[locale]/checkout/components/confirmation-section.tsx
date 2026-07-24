"use client";

import { Label } from "~/ui/primitives/label";
import { Checkbox } from "~/ui/primitives/checkbox";

interface ConfirmationSectionProps {
  callToConfirm: boolean;
  onChange: (v: boolean) => void;
  tChk: (key: string) => string;
}

export function ConfirmationSection({
  callToConfirm,
  onChange,
  tChk,
}: ConfirmationSectionProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="co-call-confirm"
        checked={callToConfirm}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <Label htmlFor="co-call-confirm" className="cursor-pointer">
        {tChk("callToConfirm")}
      </Label>
    </div>
  );
}
