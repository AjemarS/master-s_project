export const MAX_PHONE_DIGITS = 12;

// Canonical international digits (380 + 9). Converts local format to international.
// - "0671234567" (leading 0) -> "380671234567" (prefix applied immediately, cap 12)
// - "380671234567" (12 digits) -> unchanged
// - anything else -> digits capped at 12, no prefix invented (validation decides)
export function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0")) return ("380" + digits.slice(1)).slice(0, 12);
  return digits.slice(0, 12);
}

// Display format "+380 67 123 45 67" built from normalizePhoneDigits(value).
// Empty -> "" ; partial -> progressive grouping like current implementation.
export function formatPhone(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";

  let clean = digits;
  if (!clean.startsWith("380")) clean = "380" + clean.replace(/^380?/, "");
  clean = clean.slice(0, MAX_PHONE_DIGITS);
  const match = clean.slice(3).match(/^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/);
  if (!match) return "+380 ";
  let formatted = "+380 ";
  if (match[1]) formatted += match[1];
  if (match[2]) formatted += " " + match[2];
  if (match[3]) formatted += " " + match[3];
  if (match[4]) formatted += " " + match[4];
  return formatted;
}

// true when normalizePhoneDigits(value).length === MAX_PHONE_DIGITS
export function isValidPhone(value: string): boolean {
  return normalizePhoneDigits(value).length === MAX_PHONE_DIGITS;
}
