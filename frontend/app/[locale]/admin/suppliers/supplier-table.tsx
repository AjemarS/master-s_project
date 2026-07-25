"use client";

import { useTranslations } from "next-intl";
import { Truck, Pencil, Trash2 } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/ui/primitives/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { EmptyState } from "../components";
import type { Supplier } from "~/lib/types";

interface SupplierTableProps {
  suppliers: Supplier[];
  isAdmin: boolean;
  colSpan: number;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
}

export function SupplierTable({
  suppliers,
  isAdmin,
  colSpan,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">{t("title")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {suppliers.length > 0
                ? tc("count", { count: suppliers.length })
                : t("noSuppliers")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg dark:border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b dark:border-border">
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("contactPerson")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{tc("active")}</TableHead>
                {isAdmin && (
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <EmptyState icon={Truck} message={t("noSuppliers")} colSpan={colSpan} />
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.contact_person}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.phone}
                    </TableCell>
                    <TableCell className="text-primary dark:text-primary">
                      {s.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? tc("yes") : tc("no")}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDelete(s.id)}
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
      </CardContent>
    </Card>
  );
}
