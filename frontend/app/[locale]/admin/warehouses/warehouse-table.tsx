"use client";

import { useTranslations } from "next-intl";
import { Warehouse as WarehouseIcon, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { EmptyState } from "../components";
import type { Warehouse } from "~/lib/types";

interface WarehouseTableProps {
  warehouses: Warehouse[];
  isLoading: boolean;
  isAdmin: boolean;
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (id: number) => void;
}

export function WarehouseTable({ warehouses, isLoading, isAdmin, onEdit, onDelete }: WarehouseTableProps) {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  if (isLoading) return null;

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">{t("overview")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {tc("count", { count: warehouses.length })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg dark:border-border max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b dark:border-border">
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("address")}</TableHead>
                <TableHead>{t("active")}</TableHead>
                {isAdmin && <TableHead className="text-right">{tc("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length === 0 ? (
                <EmptyState icon={WarehouseIcon} message={t("noWarehouses")} colSpan={isAdmin ? 5 : 4} />
              ) : (
                warehouses.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.name}</TableCell>
                    <TableCell>
                      <Badge variant={wh.type === "warehouse" ? "default" : "secondary"}>
                        {wh.type === "warehouse" ? t("warehouse") : t("showroom")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{wh.address}</TableCell>
                    <TableCell>
                      <Badge variant={wh.is_active ? "default" : "secondary"}>
                        {wh.is_active ? tc("yes") : tc("no")}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onEdit(wh)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(wh.id)}>
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
      </CardContent>
    </Card>
  );
}
