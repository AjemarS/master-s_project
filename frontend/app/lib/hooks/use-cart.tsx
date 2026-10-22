"use client";

import * as React from "react";
import { cartApi } from "../api/client";
import { useCurrentUser } from "../auth-client";
import { getImageUrl } from "../utils/image-url";
import { getSessionId } from "../session-id";
import type { CartResponse } from "../types";

export interface CartItem {
  category: string;
  id: string;
  slug?: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartContextType {
  /** Resolves to whether the server accepted the item, so callers can tell the buyer */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<boolean>;
  clearCart: () => Promise<void>;
  itemCount: number;
  items: CartItem[];
  removeItem: (id: string) => Promise<void>;
  subtotal: number;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

function cartResponseToItems(res: CartResponse): CartItem[] {
  return res.items.map((item) => ({
    category: "",
    id: String(item.product),
    image: getImageUrl(item.product_image),
    name: item.product_name,
    price: Number(item.product_price),
    quantity: item.quantity,
  }));
}

export function CartProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const { user } = useCurrentUser();


  // Load cart from server on mount and on login change
  React.useEffect(() => {
    let cancelled = false;
    // Ensure session_id exists before fetching
    getSessionId();
    cartApi.get().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setItems(cartResponseToItems(res.data));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  // Merge anonymous cart on login (only if session cart has items)
  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    // Check if session cart exists and has items before merging
    const sessionId = getSessionId();
    if (!sessionId) return;
    cartApi.merge().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setItems(cartResponseToItems(res.data));
      } else {
        cartApi.get().then((r) => {
          if (cancelled) return;
          if (r.data) setItems(cartResponseToItems(r.data));
        });
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refreshCart = React.useCallback(() => {
    cartApi.get().then((res) => {
      if (res.data) setItems(cartResponseToItems(res.data));
    });
  }, []);

  const addItem = React.useCallback(async (newItem: Omit<CartItem, "quantity">, qty = 1) => {
    const id = parseInt(newItem.id, 10);
    if (isNaN(id)) return false;
    const res = await cartApi.addItem(id, qty);
    refreshCart();
    return !res.error;
  }, [refreshCart]);

  // Quantity, removal and clearing change the list at once; the server follows. Rapid +/- clicks
  // on one line become a single request, and a failed request re-reads the cart from the server.
  const pendingQty = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const removeItem = React.useCallback(async (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    clearTimeout(pendingQty.current.get(id));
    pendingQty.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== idStr));
    const res = await cartApi.removeItem(id);
    if (res.error) refreshCart();
  }, [refreshCart]);

  const updateQuantity = React.useCallback(async (idStr: string, qty: number) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    if (qty <= 0) return removeItem(idStr);
    setItems((prev) => prev.map((i) => (i.id === idStr ? { ...i, quantity: qty } : i)));
    clearTimeout(pendingQty.current.get(id));
    pendingQty.current.set(id, setTimeout(async () => {
      pendingQty.current.delete(id);
      const res = await cartApi.updateItem(id, qty);
      // The server may refuse or cap the quantity (stock); show what it kept unless the user moved on
      if (res.error && !pendingQty.current.has(id)) refreshCart();
    }, 400));
  }, [refreshCart, removeItem]);

  const clearCart = React.useCallback(async () => {
    for (const timer of pendingQty.current.values()) clearTimeout(timer);
    pendingQty.current.clear();
    setItems([]);
    const res = await cartApi.clear();
    if (res.error) refreshCart();
  }, [refreshCart]);

  const itemCount = React.useMemo(
    () => items.reduce((t, i) => t + i.quantity, 0),
    [items]
  );

  const subtotal = React.useMemo(
    () => items.reduce((t, i) => t + i.price * i.quantity, 0),
    [items]
  );

  const value = React.useMemo<CartContextType>(
    () => ({ addItem, clearCart, itemCount, items, removeItem, subtotal, updateQuantity }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal]
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextType {
  const ctx = React.use(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
