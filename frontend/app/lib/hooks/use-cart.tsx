"use client";

import * as React from "react";
import { cartApi } from "../api/client";
import { useCurrentUser } from "../auth-client";
import { getImageUrl } from "../utils/image-url";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface CartItem {
  category: string;
  id: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartContextType {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  clearCart: () => void;
  itemCount: number;
  items: CartItem[];
  removeItem: (id: string) => void;
  subtotal: number;
  updateQuantity: (id: string, quantity: number) => void;
}

/* -------------------------------------------------------------------------- */
/*                                Context                                     */
/* -------------------------------------------------------------------------- */

const CartContext = React.createContext<CartContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*                         Local-storage helpers                              */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "cart";
const DEBOUNCE_MS = 500;

const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as CartItem[];
    }
  } catch {
    // Corrupted storage
  }
  return [];
};

/* -------------------------------------------------------------------------- */
/*                               Provider                                     */
/* -------------------------------------------------------------------------- */

export function CartProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = React.useState<CartItem[]>(loadCartFromStorage);
  const { user } = useCurrentUser();
  const prevUserId = React.useRef<string | null>(null);
  const isMerging = React.useRef(false);

  /* -------------------- Persist to localStorage (debounced) ------------- */
  const saveTimeout = React.useRef<null | ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Storage full or unavailable
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [items]);

  /* -------------------- Server-side cart sync on login ------------------ */
  React.useEffect(() => {
    const userId = user?.id || null;

    // User logged in — merge local cart to server
    if (userId && prevUserId.current !== userId && !isMerging.current) {
      isMerging.current = true;
      const localItems = loadCartFromStorage();
      if (localItems.length > 0) {
        cartApi
          .merge(
            localItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            }))
          )
          .then(() => {
            // After merge, fetch server cart and replace local
            return cartApi.get();
          })
          .then((response) => {
            if (response.data?.items) {
              const serverItems: CartItem[] = response.data.items.map(
                (item) => ({
                  category: "",
                  id: String(item.product),
                  image: getImageUrl(item.product_image),
                  name: item.product_name,
                  price: item.product_price,
                  quantity: item.quantity,
                })
              );
              setItems(serverItems);
              isMerging.current = false;
            }
          })
          .catch(() => {
            isMerging.current = false;
          });
      } else {
        // No local items, just fetch server cart
        cartApi
          .get()
          .then((response) => {
            if (response.data?.items) {
              const serverItems: CartItem[] = response.data.items.map(
                (item) => ({
                  category: "",
                  id: String(item.product),
                  image: getImageUrl(item.product_image),
                  name: item.product_name,
                  price: item.product_price,
                  quantity: item.quantity,
                })
              );
              setItems(serverItems);
            }
          })
          .catch(() => {})
          .finally(() => {
            isMerging.current = false;
          });
      }
    }

    // User logged out — clear and reset to local
    if (!userId && prevUserId.current) {
      setItems(loadCartFromStorage());
    }

    prevUserId.current = userId;
  }, [user?.id]);

  /* ----------------------------- Actions -------------------------------- */
  const addItem = React.useCallback(
    (newItem: Omit<CartItem, "quantity">, qty = 1) => {
      if (qty <= 0) return;
      setItems((prev) => {
        const existing = prev.find((i) => i.id === newItem.id);
        if (existing) {
          return prev.map((i) =>
            i.id === newItem.id
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [...prev, { ...newItem, quantity: qty }];
      });
    },
    []
  );

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = React.useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return i;
        if (qty <= 0) return [];
        if (qty === i.quantity) return i;
        return { ...i, quantity: qty };
      })
    );
  }, []);

  const clearCart = React.useCallback(() => setItems([]), []);

  /* --------------------------- Derived data ----------------------------- */
  const itemCount = React.useMemo(
    () => items.reduce((t, i) => t + i.quantity, 0),
    [items]
  );

  const subtotal = React.useMemo(
    () => items.reduce((t, i) => t + i.price * i.quantity, 0),
    [items]
  );

  /* ----------------------------- Context value -------------------------- */
  const value = React.useMemo<CartContextType>(
    () => ({
      addItem,
      clearCart,
      itemCount,
      items,
      removeItem,
      subtotal,
      updateQuantity,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal]
  );

  return <CartContext value={value}>{children}</CartContext>;
}

/* -------------------------------------------------------------------------- */
/*                                 Hook                                      */
/* -------------------------------------------------------------------------- */

export function useCart(): CartContextType {
  const ctx = React.use(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}