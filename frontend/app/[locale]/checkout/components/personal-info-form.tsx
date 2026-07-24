"use client";

import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";

interface PersonalInfoFormProps {
  name: string;
  email: string;
  phone: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  errors: Record<string, string>;
  onBlur: (field: string) => void;
  tChk: (key: string) => string;
}

export function PersonalInfoForm({
  name,
  email,
  phone,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  errors,
  onBlur,
  tChk,
}: PersonalInfoFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="co-name">{tChk("nameLabel")}</Label>
        <Input
          id="co-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => onBlur("name")}
          className={`mt-1.5 ${errors.name ? "border-destructive" : ""}`}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name}</p>
        )}
      </div>
      <div>
        <Label htmlFor="co-email">{tChk("emailLabel")}</Label>
        <Input
          id="co-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={() => onBlur("email")}
          className={`mt-1.5 ${errors.email ? "border-destructive" : ""}`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email}</p>
        )}
      </div>
      <div>
        <Label htmlFor="co-phone">{tChk("phoneLabel")}</Label>
        <Input
          id="co-phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          onBlur={() => onBlur("phone")}
          placeholder={tChk("phonePlaceholder")}
          className={`mt-1.5 ${errors.phone ? "border-destructive" : ""}`}
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
        )}
      </div>
    </div>
  );
}
