"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
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
import { Button } from "~/ui/primitives/button";
import { FolderTree, Pencil, Trash2 } from "lucide-react";
import { TableSkeleton, EmptyState } from "../components";
import type { Category } from "~/lib/types";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  isLoading: boolean;
}

export function CategoryTable({ categories, onEdit, onDelete, isLoading }: CategoryTableProps) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t("title")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {categories.length > 0
            ? tc("count", { count: categories.length })
            : t("noCategories")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="border rounded-lg dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b dark:border-border">
                  <TableHead>{t("id")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("parent")}</TableHead>
                  <TableHead>{t("products")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <EmptyState icon={FolderTree} message={t("noCategories")} colSpan={5} />
                ) : (
                  categories.filter((c) => !c.parent).map((cat) => (
                    <Fragment key={cat.id}>
                      <TableRow>
                        <TableCell className="font-medium">#{cat.id}</TableCell>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1">
                            <FolderTree className="h-3.5 w-3.5 text-primary" />
                            {cat.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">&mdash;</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cat.product_count ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => onEdit(cat)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(cat)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {cat.children?.map((child) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">#{child.id}</TableCell>
                          <TableCell className="font-medium pl-8">
                            └ {child.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {child.product_count ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => onEdit(child)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDelete(child)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
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
