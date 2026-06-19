import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(() => true, () => false, emptySubscribe);
}
