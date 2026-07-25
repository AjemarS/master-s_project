"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Search, Plus, Loader2, ShoppingCart, AlertTriangle } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import type { Product } from "~/lib/types";

interface POSProductGridProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  products: Product[];
  filteredProducts: Product[];
  selectedWarehouse: number | null;
  stockByProduct: Map<number, number> | null;
  stockError: string | null;
  loading: boolean;
  onAddToReceipt: (product: Product) => void;
}

export function POSProductGrid({
  searchTerm,
  onSearchChange,
  products,
  filteredProducts,
  selectedWarehouse,
  stockByProduct,
  stockError,
  loading,
  onAddToReceipt,
}: POSProductGridProps) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");

  const isStockLoading = !!(selectedWarehouse && stockByProduct === null && !stockError);
  const showLoading = loading || isStockLoading;
  const showStockError = stockError !== null && selectedWarehouse;
  const showProductGrid = filteredProducts.length > 0 && !showLoading;
  const showNoResults = !showLoading && !!searchTerm.trim() && products.length === 0;
  const showNoStock =
    !showLoading && products.length > 0 && filteredProducts.length === 0 && selectedWarehouse && !stockError;
  const showInitialPrompt = !showLoading && !searchTerm.trim() && products.length === 0 && !showStockError;

  return (
    <div className="lg:col-span-2 space-y-6">
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t("searchTitle")}</CardTitle>
          <CardDescription className="text-muted-foreground">{t("searchDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {showStockError && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-destructive/10 border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("stockUnavailable")}</span>
        </div>
      )}

      {showLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          {isStockLoading ? t("stockLoading") : tc("loading")}
        </div>
      )}

      {showProductGrid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const stockQty = selectedWarehouse && stockByProduct ? (stockByProduct.get(product.id) ?? null) : null;
            const canAdd = selectedWarehouse
              ? (!stockError && stockQty !== null && stockQty > 0)
              : product.in_stock;
            const isAddDisabled = !canAdd || isStockLoading;

            return (
              <Card
                key={product.id}
                className={`dark:bg-card dark:border-border hover:shadow-md transition-shadow${isAddDisabled ? " opacity-60" : " cursor-pointer"}`}
                onClick={() => {
                  if (!isAddDisabled) onAddToReceipt(product);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-lg font-bold text-primary dark:text-primary">
                      {formatCurrency(product.price)}
                    </div>
                    {selectedWarehouse ? (
                      <span
                        className={`text-xs mt-1 inline-block ${stockQty !== null && stockQty > 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {stockQty !== null
                          ? `${stockQty} ${t("inStock").toLowerCase()}`
                          : isStockLoading
                            ? t("stockLoading")
                            : "\u2014"}
                      </span>
                    ) : (
                      <Badge variant={product.in_stock ? "default" : "secondary"} className="mt-1">
                        {product.in_stock ? t("inStock") : t("outOfStock")}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isAddDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAddDisabled) onAddToReceipt(product);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showNoResults && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p>{t("noProducts")}</p>
        </div>
      )}

      {showNoStock && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p>{t("noStockInWarehouse")}</p>
        </div>
      )}

      {showInitialPrompt && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {t("searchProduct")}
        </div>
      )}
    </div>
  );
}
