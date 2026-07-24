"use client";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Badge } from "~/ui/primitives/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "../components";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/ui/primitives/dialog";
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [receipt, setReceipt] = useState<ReceiptItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSaleConfirm, setShowSaleConfirm] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const [stockByProduct, setStockByProduct] = useState<Map<number, number> | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  useEffect(() => {
    warehouseApi.getAll().then((res) => {
      if (res.data?.results) {
        setWarehouses(res.data.results);
        if (res.data.results.length === 1) {
          setSelectedWarehouse(res.data.results[0].id);
        }
      }
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
        (res.data ?? []).forEach((s: Stock) => {
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

  useEffect(() => {
    let cancelled = false;

    if (!debouncedSearchTerm.trim()) {
      startTransition(() => setProducts([]));
      return;
    }

    startTransition(() => setLoading(true));
    productApi.getAll({ search: debouncedSearchTerm, pageSize: 20 })
      .then((res) => {
        if (cancelled) return;
        const results = res.data?.results;
        if (results) {
          startTransition(() =>
            setProducts(
              results.map((p: Product) => ({
                ...p,
                price: Number(p.price),
                original_price: Number(p.original_price),
                rating: Number(p.rating),
              }))
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t("searchError"));
      })
      .finally(() => {
        if (!cancelled) startTransition(() => setLoading(false));
      });

    return () => { cancelled = true; };
  }, [debouncedSearchTerm, t]);

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

  const handleCompleteSale = () => {
    if (!selectedWarehouse) {
      toast.error(t("selectWarehouse"));
      return;
    }
    if (receipt.length === 0) {
      toast.error(t("addItemsToReceipt"));
      return;
    }
    setShowSaleConfirm(true);
  };

  const handleSaleConfirm = async () => {
    if (!selectedWarehouse) return;
    setShowSaleConfirm(false);
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
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={CreditCard}
          backLabel={tc("back")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-card dark:border-border">
              <CardHeader>
                <CardTitle className="text-foreground">{t("searchTitle")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("searchDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("search")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                      onClick={() => { if (!isAddDisabled) addToReceipt(product); }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-lg font-bold text-primary dark:text-primary">
                            {formatCurrency(product.price)}
                          </div>
                          {selectedWarehouse ? (
                            <span className={`text-xs mt-1 inline-block ${stockQty !== null && stockQty > 0 ? "text-primary" : "text-destructive"}`}>
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

          <div className="space-y-4">
            <Card className="dark:bg-card dark:border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  {t("receipt")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pos-warehouse" className="text-xs text-muted-foreground mb-1 block">{t("warehouse")}</Label>
                  <Select value={selectedWarehouse ? String(selectedWarehouse) : ""} onValueChange={(v) => setSelectedWarehouse(v ? Number(v) : null)}>
                    <SelectTrigger id="pos-warehouse" className="w-full"><SelectValue placeholder={t("selectWarehouse")} /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pos-customer-name" className="text-xs text-muted-foreground mb-1 block">{t("customerName")}</Label>
                  <Input
                    id="pos-customer-name"
                    placeholder={t("customerName")}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="pos-customer-phone" className="text-xs text-muted-foreground mb-1 block">{t("customerPhone")}</Label>
                  <Input
                    id="pos-customer-phone"
                    placeholder={t("customerPhone")}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="border-t dark:border-border pt-4">
                  {receipt.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {t("emptyReceipt")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {receipt.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between py-2 border-b dark:border-border">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.price)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.product_id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 text-lg font-bold text-foreground">
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

        <Dialog open={showSaleConfirm} onOpenChange={setShowSaleConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("confirmSaleTitle")}</DialogTitle>
              <DialogDescription>{t("confirmSaleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-60 overflow-y-auto space-y-2">
              {receipt.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="font-medium truncate block">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="font-semibold whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-bold">
              <span>{t("total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaleConfirm(false)} disabled={submitting}>{tc("cancel")}</Button>
              <Button onClick={handleSaleConfirm} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {submitting ? tc("loading") : t("confirmSale")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
