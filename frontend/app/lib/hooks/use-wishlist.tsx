"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "techhub_wishlist";

export function useWishlist() {
  const [items, setItems] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (intentional one-shot sync)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addItem = useCallback((id: number) => {
    setItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i !== id));
  }, []);

  const toggleItem = useCallback((id: number) => {
    setItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const isInWishlist = useCallback((id: number) => items.includes(id), [items]);

  const itemCount = useMemo(() => items.length, [items]);

  return {
    items,
    addItem,
    removeItem,
    toggleItem,
    isInWishlist,
    itemCount,
    isHydrated,
  };
}
