"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "techhub_recent_products";
const MAX_RECENT = 10;

interface RecentProduct {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
}

function loadFromStorage(): RecentProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(products: RecentProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products.slice(0, MAX_RECENT)));
  } catch { /* quota exceeded */ }
}

export function useRecentProducts() {
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>(loadFromStorage);

  const addProduct = useCallback((product: RecentProduct) => {
    setRecentProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, MAX_RECENT);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentProducts([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentProducts, addProduct, clearRecent };
}
