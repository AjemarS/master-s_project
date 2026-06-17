import SummaryPageClient from "./page-client";
import type { Product } from "~/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

async function getInitialProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_URL}/products/?limit=100`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    const rawProducts = data.results || data || [];
    return rawProducts.map((p: Product) => ({
      ...p,
      price: Number(p.price),
      original_price: Number(p.original_price),
      rating: Number(p.rating),
    }));
  } catch {
    return [];
  }
}

export default async function SummaryPage() {
  const initialProducts = await getInitialProducts();

  return <SummaryPageClient initialProducts={initialProducts} />;
}