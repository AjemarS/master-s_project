import AdminProductsClient from "./page-client";
import { Product } from "~/lib/types";

const API_URL = process.env.API_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

async function getProducts(): Promise<{ products: Product[]; totalCount: number; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/products/?limit=100`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      return { products: [], totalCount: 0, error: "Failed to load products" };
    }
    const data = await response.json();
    const rawProducts = data.results || data || [];
    const products = rawProducts.map((p: Product) => ({
      ...p,
      price: Number(p.price),
      original_price: Number(p.original_price),
      rating: Number(p.rating),
    }));
    return { products, totalCount: data.count ?? products.length };
  } catch {
    return { products: [], totalCount: 0, error: "Failed to connect to product service" };
  }
}

export default async function ProductsPage() {
  const { products, totalCount } = await getProducts();

  return <AdminProductsClient initialProducts={products} initialTotalCount={totalCount} />;
}