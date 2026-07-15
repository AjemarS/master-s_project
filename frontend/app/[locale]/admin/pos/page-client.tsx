"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "../components";
import { formatCurrency } from "~/lib/utils/format";
import { productApi, warehouseApi, orderApi, stockApi } from "~/lib/api/admin-api";
import type { Product, Warehouse, Stock } from "~/lib/types";

interface ReceiptItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

export function POSClient() {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [receipt, setReceipt] = useState<ReceiptItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const [stockByProduct, setStockByProduct] = useState<Map<number, number> | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  useEffect(() => {
    warehouseApi.getAll().then((res) => {
      if (res.data?.results) setWarehouses(res.data.results);
    });
  }, []);

  useEffect(() => {
    if (!selectedWarehouse) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    stockApi.getAll({ warehouse_id: selectedWarehouse }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.error) throw new Error(res.error.message);
        const map = new Map<number, number>();
        (res.data?.results ?? []).forEach((s: Stock) => {
          map.set(s.product_id, s.available);
        });
        setStockByProduct(map);
        setStockError(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setStockError(err.message || "Failed to load stock data");
        setStockByProduct(null);
      });

    return () => {
      controller.abort();
      setStockByProduct(null);
      setStockError(null);
    };
  }, [selectedWarehouse]);

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await productApi.getAll({ search: query, pageSize: 20 });
      if (res.data?.results) {
        setProducts(
          res.data.results.map((p: Product) => ({
            ...p,
            price: Number(p.price),
            original_price: Number(p.original_price),
            rating: Number(p.rating),
          }))
        );
      }
    } catch {
      toast.error(t("searchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const addToReceipt = (product: Product) => {
    setReceipt((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { product_id: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setReceipt((prev) =>
      prev
        .map((item) =>
          item.product_id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setReceipt((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const total = receipt.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredProducts = useMemo(() => {
    if (!selectedWarehouse || stockError || stockByProduct === null) return products;
    return products.filter((p) => (stockByProduct.get(p.id) ?? 0) > 0);
  }, [products, selectedWarehouse, stockByProduct, stockError]);

  const isStockLoading = !!(selectedWarehouse && stockByProduct === null && !stockError);
  const showLoading = loading || isStockLoading;
  const showStockError = stockError !== null && selectedWarehouse;
  const showProductGrid = filteredProducts.length > 0 && !showLoading;
  const showNoResults = !showLoading && !!searchTerm.trim() && products.length === 0;
  const showNoStock = !showLoading && products.length > 0 && filteredProducts.length === 0 && selectedWarehouse && !stockError;
  const showInitialPrompt = !showLoading && !searchTerm.trim() && products.length === 0 && !showStockError;

  const handleCompleteSale = async () => {
    if (!selectedWarehouse) {
      toast.error(t("selectWarehouse"));
      return;
    }
    if (receipt.length === 0) {
      toast.error(t("addItemsToReceipt"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await orderApi.pos({
        warehouse_id: selectedWarehouse,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        items: receipt.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(t("saleComplete"));
      setReceipt([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : t("saleError") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={CreditCard}
          backLabel={tc("back")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">{t("searchTitle")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("searchDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder={t("search")}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {showStockError && (
              <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t("stockUnavailable")}</span>
              </div>
            )}

            {showLoading && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                      className={`dark:bg-slate-800/80 dark:border-slate-700 hover:shadow-md transition-shadow${isAddDisabled ? " opacity-60" : " cursor-pointer"}`}
                      onClick={() => { if (!isAddDisabled) addToReceipt(product); }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{product.name}</div>
                          <div className="text-lg font-bold text-primary dark:text-primary">
                            {formatCurrency(product.price)}
                          </div>
                          {selectedWarehouse ? (
                            <span className={`text-xs mt-1 inline-block ${stockQty !== null && stockQty > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
                        <Button size="sm" variant="outline" disabled={isAddDisabled} onClick={(e) => { e.stopPropagation(); if (!isAddDisabled) addToReceipt(product); }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {showNoResults && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p>{t("noProducts")}</p>
              </div>
            )}

            {showNoStock && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p>{t("noStockInWarehouse")}</p>
              </div>
            )}

            {showInitialPrompt && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                {t("searchProduct")}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                  {t("receipt")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{t("warehouse")}</label>
                  <Select value={selectedWarehouse ? String(selectedWarehouse) : ""} onValueChange={(v) => setSelectedWarehouse(v ? Number(v) : null)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t("selectWarehouse")} /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{t("customerName")}</label>
                  <Input
                    placeholder={t("customerName")}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{t("customerPhone")}</label>
                  <Input
                    placeholder={t("customerPhone")}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="border-t dark:border-slate-700 pt-4">
                  {receipt.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                      {t("emptyReceipt")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {receipt.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between py-2 border-b dark:border-slate-700">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{item.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.quantity} × {formatCurrency(item.price)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium text-slate-900 dark:text-slate-200">{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeItem(item.product_id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <span>{t("total")}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    disabled={receipt.length === 0 || !selectedWarehouse || submitting}
                    onClick={handleCompleteSale}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t("submitSale")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
