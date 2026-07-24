"use client";

import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import { RadioGroup, RadioGroupItem } from "~/ui/primitives/radio-group";

interface ReceiverFormProps {
  isSelfReceiver: boolean;
  receiverName: string;
  receiverPhone: string;
  onSelfChange: (self: boolean) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  tChk: (key: string) => string;
}

export function ReceiverForm({
  isSelfReceiver,
  receiverName,
  receiverPhone,
  onSelfChange,
  onNameChange,
  onPhoneChange,
  tChk,
}: ReceiverFormProps) {
  return (
    <div className="space-y-3">
      <RadioGroup
        value={isSelfReceiver ? "self" : "other"}
        onValueChange={(val) => onSelfChange(val === "self")}
        className="space-y-3"
      >
        <Label
          className={`flex items-center gap-2 border rounded-lg p-4 cursor-pointer transition-colors ${
            isSelfReceiver
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <RadioGroupItem value="self" />
          <span className="font-medium">{tChk("selfReceiver")}</span>
        </Label>

        <Label
          className={`flex items-center gap-2 border rounded-lg p-4 cursor-pointer transition-colors ${
            !isSelfReceiver
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <RadioGroupItem value="other" />
          <span className="font-medium">{tChk("otherReceiver")}</span>
        </Label>
      </RadioGroup>

      {!isSelfReceiver && (
        <>
          <div>
            <Label htmlFor="co-receiver-name">{tChk("receiverName")}</Label>
            <Input
              id="co-receiver-name"
              value={receiverName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={tChk("receiverNamePlaceholder")}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="co-receiver-phone">{tChk("receiverPhone")}</Label>
            <Input
              id="co-receiver-phone"
              value={receiverPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder={tChk("receiverPhonePlaceholder")}
              className="mt-1.5"
            />
          </div>
        </>
      )}
    </div>
  );
}
