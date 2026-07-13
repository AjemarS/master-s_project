"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { cn } from "~/lib/cn";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "~/ui/primitives/drawer";
import { Separator } from "~/ui/primitives/separator";
import { formatCurrency } from "~/lib/utils/format";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/ui/primitives/sheet";
import { useCart } from "~/lib/hooks/use-cart";
import { useMounted } from "~/lib/hooks/use-mounted";

export type { CartItem } from "~/lib/hooks/use-cart";

interface CartProps {
  className?: string;
}

export function CartClient({ className }: CartProps) {
  const {
    items: cartItems,
    itemCount: totalItems,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const isMounted = useMounted();
  const t = useTranslations("cart");

  const isDesktop = React.useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia("(min-width: 768px)");
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );

  const formattedSubtotal = React.useMemo(() => formatCurrency(subtotal), [subtotal]);

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(id, newQuantity);
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const CartTrigger = (
    <Button
      aria-label={t("shoppingCart")}
      className="relative h-9 w-9 rounded-full"
      size="icon"
      variant="outline"
    >
      <ShoppingCart className="h-4 w-4" />
      {totalItems > 0 && (
        <Badge
          className={`
            absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px]
          `}
          variant="default"
        >
          {totalItems}
        </Badge>
      )}
    </Button>
  );

  const CartContent = (
    <>
      <div className="flex flex-col">
        <div className="flex-1 overflow-y-auto px-6">
          <AnimatePresence>
            {cartItems.length === 0 ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <div
                  className={`
                    mb-4 flex h-20 w-20 items-center justify-center rounded-full
                    bg-muted
                  `}
                >
                  <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  {t("emptyDesc")}
                </p>
                {isDesktop ? (
                  <SheetClose asChild>
                    <Link href="/products">
                      <Button>{t("browseProducts")}</Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <DrawerClose asChild>
                    <Link href="/products">
                      <Button>{t("browseProducts")}</Button>
                    </Link>
                  </DrawerClose>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4 py-4">
                {cartItems.map((item) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      group relative flex rounded-lg border bg-card p-2
                      shadow-sm transition-colors
                      hover:bg-accent/50
                    `}
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key={item.id}
                    layout
                    transition={{ duration: 0.15 }}
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded">
                      <Image
                        alt={item.name}
                        className="object-cover"
                        fill
                        src={item.image}
                      />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <Link
                            className={`
                              line-clamp-2 text-sm font-medium
                              group-hover:text-accent-electric
                            `}
                            href={`/products/${item.slug || item.id}`}
                            onClick={() => setIsOpen(false)}
                          >
                            {item.name}
                          </Link>
                          <button
                            className={`
                              -mt-1 -mr-1 ml-2 rounded-full p-1
                              text-muted-foreground transition-colors
                              hover:bg-muted hover:text-destructive
                            `}
                            onClick={() => handleRemoveItem(item.id)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border">
                          <button
                            className={`
                              flex h-7 w-7 items-center justify-center
                              rounded-l-md border-r text-muted-foreground
                              transition-colors
                              hover:bg-muted hover:text-foreground
                            `}
                            disabled={item.quantity <= 1}
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity - 1)
                            }
                            type="button"
                          >
                            <Minus className="h-3 w-3" />
                            <span className="sr-only">Decrease quantity</span>
                          </button>
                          <span
                            className={`
                              flex h-7 w-7 items-center justify-center text-xs
                              font-medium
                            `}
                          >
                            {item.quantity}
                          </span>
                          <button
                            className={`
                              flex h-7 w-7 items-center justify-center
                              rounded-r-md border-l text-muted-foreground
                              transition-colors
                              hover:bg-muted hover:text-foreground
                            `}
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity + 1)
                            }
                            type="button"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="sr-only">Increase quantity</span>
                          </button>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {cartItems.length > 0 && (
          <div className="border-t px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="font-medium">{formattedSubtotal}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("shipping")}</span>
                <span className="font-medium">{t("shippingCalc")}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">{t("total")}</span>
                <span className="text-base font-semibold">
                  {formattedSubtotal}
                </span>
              </div>
               <Button className="w-full" size="lg" onClick={() => { setIsOpen(false); router.push("/checkout"); }}>
                {t("checkout")}
              </Button>
              <div className="flex items-center justify-between">
                {isDesktop ? (
                  <SheetClose asChild>
                    <Button variant="outline">{t("continueShopping")}</Button>
                  </SheetClose>
                ) : (
                  <DrawerClose asChild>
                    <Button variant="outline">{t("continueShopping")}</Button>
                  </DrawerClose>
                )}
                <Button
                  className="ml-2"
                  onClick={handleClearCart}
                  variant="outline"
                >
                  {t("clearCart")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (!isMounted) {
    return (
      <div className={cn("relative", className)}>
        <Button
          aria-label={t("shoppingCart")}
          className="relative h-9 w-9 rounded-full"
          size="icon"
          variant="outline"
        >
          <ShoppingCart className="h-4 w-4" />
          {totalItems > 0 && (
            <Badge
              className={`
                absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px]
              `}
              variant="default"
            >
              {totalItems}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isDesktop ? (
        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger asChild>{CartTrigger}</SheetTrigger>
          <SheetContent className="flex w-[400px] flex-col p-0">
            <SheetHeader>
              <SheetTitle>{t("shoppingCart")}</SheetTitle>
            </SheetHeader>
            {CartContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer onOpenChange={setIsOpen} open={isOpen}>
          <DrawerTrigger asChild>{CartTrigger}</DrawerTrigger>
          <DrawerContent>{CartContent}</DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
