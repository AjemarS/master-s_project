import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useMounted() {
  return useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
}
