/** `whole`: drop ",00" when the amount has no kopecks (catalog cards, where width is tight) */
export function formatCurrency(amount: number | string, locale = "ua", whole = false): string {
  const num = Number(amount);
  if (isNaN(num)) return "—";
  if (locale === "en") {
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const digits = whole && Number.isInteger(num) ? 0 : 2;
  return `${num.toLocaleString("uk-UA", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ₴`;
}

export function formatPrice(product: { price: number; original_price: number; price_usd?: number; original_price_usd?: number }, locale = "ua") {
  if (locale === "en" && product.price_usd) {
    return {
      price: formatCurrency(product.price_usd, "en"),
      originalPrice: product.original_price && product.original_price_usd ? formatCurrency(product.original_price_usd, "en") : null,
    };
  }
  return {
    price: formatCurrency(product.price, "ua"),
    originalPrice: product.original_price ? formatCurrency(product.original_price, "ua") : null,
  };
}

/** App locale ("ua" | "en") -> Intl locale */
const intlLocale = (locale: string) => (locale === "en" ? "en-US" : "uk-UA");

export function formatDate(dateStr: string | null | undefined, locale = "ua"): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string | null | undefined, locale = "ua"): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(intlLocale(locale), {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** "5 min ago" / "5 хв тому" up to a week, then a short date */
export function formatRelativeTime(dateStr: string | null | undefined, locale = "ua"): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto", style: "short" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), "day");
  return d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
}
