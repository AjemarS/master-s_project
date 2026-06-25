"use client";

import * as React from "react";
import { cartApi } from "../api/client";
import { useCurrentUser } from "../auth-client";
import { getImageUrl } from "../utils/image-url";
import type { CartResponse } from "../types";

export interface CartItem {
  category: string;
  id: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartContextType {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<void>;
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
  const [loaded, setLoaded] = React.useState(false);

  // Load cart from server on mount and on login change
  React.useEffect(() => {
    // Ensure session_id exists in localStorage before fetching
    cartApi.getSessionId();
    queueMicrotask(() => setLoaded(false));
    cartApi.get().then((res) => {
      if (res.data) {
        setItems(cartResponseToItems(res.data));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user?.id]);

  // Merge anonymous cart on login (only if session cart has items)
  React.useEffect(() => {
    if (!user?.id) return;
    // Check if session cart exists and has items before merging
    const sessionId = localStorage.getItem("techhub_session_id");
    if (!sessionId) return;
    cartApi.merge().then((res) => {
      if (res.data) {
        setItems(cartResponseToItems(res.data));
      } else {
        cartApi.get().then((r) => {
          if (r.data) setItems(cartResponseToItems(r.data));
        });
      }
    });
  }, [user?.id]);

  const refreshCart = React.useCallback(() => {
    cartApi.get().then((res) => {
      if (res.data) setItems(cartResponseToItems(res.data));
    });
  }, []);

  const addItem = React.useCallback(async (newItem: Omit<CartItem, "quantity">, qty = 1) => {
    const id = parseInt(newItem.id, 10);
    if (isNaN(id)) return;
    await cartApi.addItem(id, qty);
    refreshCart();
  }, [refreshCart]);

  const removeItem = React.useCallback(async (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    await cartApi.removeItem(id);
    refreshCart();
  }, [refreshCart]);

  const updateQuantity = React.useCallback(async (idStr: string, qty: number) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    if (qty <= 0) {
      await cartApi.removeItem(id);
    } else {
      await cartApi.updateItem(id, qty);
    }
    refreshCart();
  }, [refreshCart]);

  const clearCart = React.useCallback(async () => {
    await cartApi.clear();
    refreshCart();
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
