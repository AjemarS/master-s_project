// Breadcrumbs

"use client";

import { createContext, useContext, ReactNode, useState } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  segments: BreadcrumbItem[] | null;
  setSegments: (segments: BreadcrumbItem[] | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  segments: null,
  setSegments: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [segments, setSegments] = useState<BreadcrumbItem[] | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ segments, setSegments }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbSegments(): BreadcrumbContextValue {
  return useContext(BreadcrumbContext);
}
