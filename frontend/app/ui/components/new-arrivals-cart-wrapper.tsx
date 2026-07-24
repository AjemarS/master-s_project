"use client";

import React from "react";
import { useCart } from "~/lib/hooks/use-cart";
import { ProductCard } from "~/ui/components/product-card";
import { StaggerContainer, StaggerItem } from "~/ui/components/motion/stagger";
import { getImageUrl } from "~/lib/utils/image-url";
import type { Product } from "~/lib/types";

function toItem(product: Product) {
  return {
    category: product.category_name || "",
    id: String(product.id),
    slug: product.slug,
    image: getImageUrl(product.image_url),
    name: product.name,
    price: Number(product.price),
  };
}

interface NewArrivalsCartWrapperProps {
  products: Product[];
}

export function NewArrivalsCartWrapper({ products }: NewArrivalsCartWrapperProps) {
  const { addItem } = useCart();

  const handleAddToCart = React.useCallback(
    async (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      try {
        await addItem(toItem(product), 1);
      } catch {
        // silent (matching existing pattern)
      }
    },
    [addItem, products],
  );

  return (
    <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} variant="compact" onAddToCart={handleAddToCart} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
