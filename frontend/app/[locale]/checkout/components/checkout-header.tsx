"use client";

import { ShoppingBag, Phone, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CheckoutHeaderProps {
  tChk: (key: string) => string;
}

export function CheckoutHeader({ tChk }: CheckoutHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{tChk("title")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>+380 (44) 123-45-67</span>
        </div>
      </div>
    </header>
  );
}

export function BackLink({ tChk }: { tChk: (key: string) => string }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      {tChk("backToStore")}
    </Link>
  );
}
