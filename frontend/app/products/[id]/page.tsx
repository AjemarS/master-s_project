import { Suspense } from "react";
import ProductDetailClient from "./page-client"
import { ProductDetail } from "~/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

async function getProduct(id: string): Promise<ProductDetail | null> {
  try {
    const response = await fetch(`${API_URL}/products/${id}/`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      ...data,
      price: Number(data.price),
      originalPrice: Number(data.originalPrice),
      rating: Number(data.rating),
      features: data.features ?? [],
      specs: data.specs ?? {},
      image: data.image ?? "",
      category: data.category || { name: "" },
    } as ProductDetail;
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 py-10">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl font-bold">Product Not Found</h1>
            <p className="mt-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading product...</p></div>}>
      <ProductDetailClient product={product} />
    </Suspense>
  );
}