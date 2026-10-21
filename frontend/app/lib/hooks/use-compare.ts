"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "techhub_compare";
/** Columns that still fit a phone-to-desktop table */
export const COMPARE_LIMIT = 4;

export type CompareToggle = "added" | "removed" | "full";

// One store for the whole page, so the card, the product page and the floating bar agree instantly
const listeners = new Set<() => void>();
let cache: number[] | null = null;
const EMPTY: number[] = [];

function read(): number[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n)).slice(0, COMPARE_LIMIT) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: number[]) {
  cache = ids;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* private mode: the list still works for this page */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the list
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Pure list logic, kept apart from storage so it can be tested */
export function toggleId(ids: number[], id: number, limit = COMPARE_LIMIT): { ids: number[]; result: CompareToggle } {
  if (ids.includes(id)) return { ids: ids.filter((i) => i !== id), result: "removed" };
  if (ids.length >= limit) return { ids, result: "full" };
  return { ids: [...ids, id], result: "added" };
}

export function useCompare() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((id: number): CompareToggle => {
    const next = toggleId(read(), id);
    if (next.result !== "full") write(next.ids);
    return next.result;
  }, []);

  const remove = useCallback((id: number) => write(read().filter((i) => i !== id)), []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, toggle, remove, clear, has };
}
