"use client";

import { useTranslations } from "next-intl";
import { ArrowRightLeft } from "lucide-react";
import { Badge } from "~/ui/primitives/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from "../components";
import type { StockMovement } from "~/lib/types";

interface StockMovementTableProps {
  movements: StockMovement[];
  isLoading: boolean;
  movementTypes: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  formatDate: (dateStr: string) => string;
}

export function StockMovementTable({ movements, isLoading, movementTypes, formatDate }: StockMovementTableProps) {
  const tSM = useTranslations("stockMovements");

  if (isLoading) {
    return <TableSkeleton rows={8} cols={8} />;
  }

  return (
    <div className="border rounded-lg dark:border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b dark:border-border">
            <TableHead>{tSM("id")}</TableHead>
            <TableHead>{tSM("type")}</TableHead>
            <TableHead>{tSM("productId")}</TableHead>
            <TableHead>{tSM("from")}</TableHead>
            <TableHead>{tSM("to")}</TableHead>
            <TableHead>{tSM("quantity")}</TableHead>
            <TableHead>{tSM("date")}</TableHead>
            <TableHead>{tSM("user")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} message={tSM("noMovements")} colSpan={8} />
          ) : (
            movements.map((m) => {
              const typeInfo = movementTypes[m.type] || { label: m.type, variant: "outline" as const };
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">#{m.id}</TableCell>
                  <TableCell><Badge variant={typeInfo.variant}>{typeInfo.label}</Badge></TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">#{m.product_id}</TableCell>
                  <TableCell className="text-muted-foreground">{m.from_warehouse_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.to_warehouse_name || "—"}</TableCell>
                  <TableCell className="font-semibold">{m.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{m.created_by || "—"}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
