"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "~/ui/primitives/table";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import { TableSkeleton, EmptyState } from "../components";
import type { GoodsReceiptNote } from "~/lib/types";

interface GoodsReceiptTableProps {
  receipts: GoodsReceiptNote[];
  isLoading: boolean;
  isAdmin: boolean;
  colSpan: number;
  onEdit: (receipt: GoodsReceiptNote) => void;
  onDelete: (id: number) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function GoodsReceiptTable({
  receipts, isLoading, isAdmin, colSpan, onEdit, onDelete,
}: GoodsReceiptTableProps) {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">{t("title")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {receipts.length > 0 ? tc("count", { count: receipts.length }) : t("noReceipts")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={4} cols={colSpan} />
        ) : (
          <div className="border rounded-lg dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b dark:border-border">
                  <TableHead>{t("id")}</TableHead>
                  <TableHead>{t("supplier")}</TableHead>
                  <TableHead>{t("warehouse")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("createdBy")}</TableHead>
                  {isAdmin && <TableHead className="text-right">{tc("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.length === 0 ? (
                  <EmptyState icon={ClipboardList} message={t("noReceipts")} colSpan={colSpan} />
                ) : (
                  receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">#{r.id}</TableCell>
                      <TableCell>{r.supplier_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.warehouse_name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.receipt_date)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.created_by}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
