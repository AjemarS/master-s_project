"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Download, ChevronDown, Package, Edit, Trash2 } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { TableSkeleton } from "../components";
import type { Product } from "~/lib/types";

interface ProductTableProps {
  products: Product[];
  onSort: (field: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  isAdmin: boolean;
  onExport: () => void;
  renderSortIcon: (field: string) => React.ReactNode;
  searchTerm?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  filterToggle?: React.ReactNode;
}

export function ProductTable({
  products,
  onSort,
  onEdit,
  onDelete,
  expandedId,
  onToggleExpand,
  isAdmin,
  onExport,
  renderSortIcon,
  searchTerm,
  isLoading,
  children,
  filterToggle,
}: ProductTableProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  return (
    <Card className="dark:bg-slate-800/80 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="dark:text-slate-100">{t("catalog")}</CardTitle>
            <CardDescription className="dark:text-slate-400">{t("catalogDesc")}</CardDescription>
          </div>
          <div className="flex gap-2">
            {filterToggle}
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              {tc("export")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 w-10"></th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => onSort("id")}>
                    {t("id")} {renderSortIcon("id")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => onSort("name")}>
                    {t("name")} {renderSortIcon("name")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("category")}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => onSort("price")}>
                    {t("price")} {renderSortIcon("price")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => onSort("stock")}>
                    {t("stock")} {renderSortIcon("stock")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("status")}</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                      {searchTerm
                        ? t("noResults")
                        : t("noProducts")}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <Fragment key={product.id}>
                      <tr
                        className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => onToggleExpand(product.id)}
                      >
                        <td className="p-4 font-medium text-slate-900 dark:text-slate-100 w-10">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === product.id ? "rotate-180" : ""}`} />
                        </td>
                        <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{product.id}</td>
                        <td className="p-4 font-medium dark:text-slate-200">{product.name}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{product.category_name || "N/A"}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">₴{Number(product.price).toFixed(2)}</td>
                        <td className="p-4">
                          <Badge variant={product.stock < 10 ? "destructive" : product.stock < 50 ? "outline" : "default"}>
                            {t("units", { count: product.stock })}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={product.in_stock ? "default" : "secondary"}>
                            {product.in_stock ? t("inStock") : t("outOfStock")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {isAdmin && (
                              <>
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(product); }} title={tc("edit")}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete(product); }} title={tc("delete")}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === product.id && (
                        <tr key={`${product.id}-detail`} className="bg-slate-50 dark:bg-slate-800/30 border-b dark:border-slate-700">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="space-y-2">
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("id")}:</span> <span className="text-slate-900 dark:text-slate-100">#{product.id}</span></div>
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("category")}:</span> <span className="text-slate-900 dark:text-slate-100">{product.category_name || "N/A"}</span></div>
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("price")}:</span> <span className="font-semibold text-slate-900 dark:text-slate-100">₴{Number(product.price).toFixed(2)}</span></div>
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("origPrice")}:</span> <span className="text-slate-500 line-through">₴{Number(product.original_price).toFixed(2)}</span></div>
                              </div>
                              <div className="space-y-2">
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("stock")}:</span> <span className="text-slate-900 dark:text-slate-100">{t("units", { count: product.stock })}</span></div>
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("rating")}:</span> <span className="text-slate-900 dark:text-slate-100">{Number(product.rating).toFixed(1)} / 5</span></div>
                                <div><span className="font-medium text-slate-600 dark:text-slate-400">{tc("status")}:</span> <span className="text-slate-900 dark:text-slate-100">{product.in_stock ? t("inStock") : t("outOfStock")}</span></div>
                                {product.image_url && (
                                  <div><span className="font-medium text-slate-600 dark:text-slate-400">{t("image")}:</span> <span className="text-slate-500 text-xs truncate block max-w-[200px]">{product.image_url}</span></div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="font-medium text-slate-600 dark:text-slate-400">{t("description")}:</div>
                                <p className="text-slate-900 dark:text-slate-100 line-clamp-3">{product.description || tc("noData")}</p>
                                {product.features && product.features.length > 0 && (
                                  <>
                                    <div className="font-medium text-slate-600 dark:text-slate-400">{t("features")}:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {product.features.map((f, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
