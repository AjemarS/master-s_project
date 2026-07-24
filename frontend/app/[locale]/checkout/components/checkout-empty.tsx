"use client";

import { ShoppingBag } from "lucide-react";

interface CheckoutEmptyProps {
  tChk: (key: string) => string;
}

export function CheckoutEmpty({ tChk }: CheckoutEmptyProps) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
      <p className="text-lg">{tChk("emptyCart")}</p>
    </div>
  );
}
