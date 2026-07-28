"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "~/ui/primitives/table";
import { ClipboardList, Eye } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { formatCurrency } from "~/lib/utils/format";
import { TableSkeleton, EmptyState } from "../components";
import type { GoodsReceiptNote } from "~/lib/types";

interface GoodsReceiptTableProps {
  receipts: GoodsReceiptNote[];
  isLoading: boolean;
  colSpan: number;
  onView: (receipt: GoodsReceiptNote) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function GoodsReceiptTable({
  receipts, isLoading, colSpan, onView,
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
                  <TableHead className="text-right">{tc("actions")}</TableHead>
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
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onView(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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
