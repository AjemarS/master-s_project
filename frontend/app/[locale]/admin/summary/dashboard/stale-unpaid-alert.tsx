"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";

interface StaleUnpaidAlertProps {
  count: number;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function StaleUnpaidAlert({ count, tSum, tc }: StaleUnpaidAlertProps) {
  if (count <= 0) return null;

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <span>
          {count === 1
            ? tSum("staleUnpaidOne", { count })
            : tSum("staleUnpaid", { count })}
        </span>
        <Button variant="outline" size="sm" asChild className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30">
          <Link href="/admin/orders?status=unpaid">
            {tc("view")}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
