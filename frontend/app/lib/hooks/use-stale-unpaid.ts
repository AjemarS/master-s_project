"use client";

import { useState, useEffect } from "react";
import { useOrders } from "~/lib/hooks/use-api-data";

const STALE_THRESHOLD_MS = 3600000; // 1 hour

/**
 * Hook that returns the count of unpaid orders older than 1 hour.
 * SWR deduplication means multiple consumers share the same request.
 */
export function useStaleUnpaidCount() {
  const { data: unpaidData, isLoading } = useOrders(
    { status: "unpaid" },
    { refreshInterval: 15000 },
  );
  const [staleUnpaidCount, setStaleUnpaidCount] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setStaleUnpaidCount(
        unpaidData?.results
          ? unpaidData.results.filter(
              (o) =>
                new Date(o.created_at).getTime() <
                Date.now() - STALE_THRESHOLD_MS,
            ).length
          : 0,
      );
    }, 0);
    return () => clearTimeout(id);
  }, [unpaidData]);

  return { staleUnpaidCount, isLoading };
}
