import { useCallback, useState } from "react";

/**
 * Filter panels with an Apply button: inputs edit `draft`, queries read `applied`,
 * and nothing is fetched until `apply()` (or `reset()`, which clears both).
 */
export function useDraftFilters<T extends Record<string, unknown>>(empty: T) {
  const [initial] = useState(empty);
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);
  const apply = useCallback(() => setApplied(draft), [draft]);
  const reset = useCallback(() => {
    setDraft(initial);
    setApplied(initial);
  }, [initial]);

  return { draft, applied, set, apply, reset };
}
