"use client";

import { Package, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "~/ui/primitives/card";

import type { CartItem } from "~/lib/hooks/use-cart";

interface CartItemsProps {
  items: CartItem[];
  locale: string;
  tChk: (key: string) => string;
  onQuantityChange: (id: string, qty: number) => void;
  formatCurrency: (v: number, locale: string) => string;
}

export function CartItems({
  items,
  locale,
  tChk,
  onQuantityChange,
  formatCurrency,
}: CartItemsProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 font-semibold text-base mb-8 sticky top-0 z-10 bg-card/95 backdrop-blur">
          <Package className="h-4 w-4 text-primary shrink-0" />
          {tChk("orderItems")}
        </div>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative size-24 shrink-0 rounded-md border bg-muted overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex items-center justify-center size-full text-muted-foreground/40">
                  <Package className="size-6" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-base font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {tChk("unitPrice")}: {formatCurrency(item.price, locale)}
              </p>

              {/* Quantity controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="inline-flex items-center justify-center size-9 rounded-md border border-input bg-background text-xs hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-base font-medium tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                  className="inline-flex items-center justify-center size-9 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Item total */}
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold">
                {formatCurrency(item.price * item.quantity, locale)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
