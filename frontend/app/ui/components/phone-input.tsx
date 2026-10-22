"use client";

import * as React from "react";
import { cn } from "~/lib/cn";
import { Input } from "~/ui/primitives/input";

const NATIONAL_DIGITS = 9;

// The 9 digits after +380, whatever the user typed or pasted: "+380 67…", "380…", "067…" or "67…"
export function nationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, NATIONAL_DIGITS);
}

// "671234567" -> "67 123 45 67"
function group(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(" ");
}

type PhoneInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  // "380" + up to 9 digits, or "" when empty: the format the checkout already validates and sends
  onChange: (value: string) => void;
};

// Ukrainian number: "+380" is fixed in front, so it never has to be typed and cannot be lost
export function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps) {
  const national = nationalDigits(value);
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground md:text-sm"
      >
        +380
      </span>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        value={group(national)}
        onChange={(e) => {
          const next = nationalDigits(e.target.value);
          onChange(next ? "380" + next : "");
        }}
        className="pl-14 md:pl-12"
      />
    </div>
  );
}
