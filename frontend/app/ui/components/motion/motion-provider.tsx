"use client";

import { MotionConfig } from "framer-motion";

/** Every framer-motion animation follows the OS "reduce motion" setting (transforms off, fades kept) */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
