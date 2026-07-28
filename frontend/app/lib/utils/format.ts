export function formatCurrency(amount: number | string, locale = "ua"): string {
  const num = Number(amount);
  if (isNaN(num)) return "—";
  if (locale === "en") {
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${num.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`;
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

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  try {
    if (diffSeconds < 60) return "щойно";
    if (diffMinutes < 60) return `${diffMinutes} хв. тому`;
    if (diffHours < 24) return `${diffHours} год. тому`;
    if (diffDays < 7) return `${diffDays} дн. тому`;
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}
