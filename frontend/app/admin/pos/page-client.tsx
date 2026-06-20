"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { productApi, warehouseApi, orderApi } from "~/lib/api/admin-api";
import type { Product, Warehouse } from "~/lib/types";

interface ReceiptItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

export function POSClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [receipt, setReceipt] = useState<ReceiptItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    warehouseApi.getAll().then((res) => {
      if (res.data?.results) setWarehouses(res.data.results);
    });
  }, []);

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
      toast.error("Помилка пошуку товарів");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleCompleteSale = async () => {
    if (!selectedWarehouse) {
      toast.error("Оберіть склад");
      return;
    }
    if (receipt.length === 0) {
      toast.error("Додайте товари до чеку");
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
      toast.success("Продаж завершено");
      setReceipt([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      toast.error("Помилка", { description: err instanceof Error ? err.message : "Не вдалося завершити продаж" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Пошук товарів</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Пошук товарів за назвою..."
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

        {loading && (
          <div className="text-center py-8 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Пошук...
          </div>
        )}

        {products.length > 0 && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => addToReceipt(product)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-lg font-bold text-blue-600">{Number(product.price).toFixed(2)} ₴</div>
                    <Badge variant={product.in_stock ? "default" : "secondary"} className="mt-1">
                      {product.in_stock ? "В наявності" : "Немає"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addToReceipt(product); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searchTerm.trim() && !loading && (
          <div className="text-center py-12 text-slate-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            Почніть пошук товарів для додавання до чеку
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Чек
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Склад</label>
              <select
                value={selectedWarehouse ?? ""}
                onChange={(e) => setSelectedWarehouse(e.target.value ? Number(e.target.value) : null)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Оберіть склад</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Iм&apos;я клієнта</label>
              <Input
                placeholder="Iм&apos;я клієнта"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Телефон</label>
              <Input
                placeholder="Телефон"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              {receipt.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Чек порожній
                </div>
              ) : (
                <div className="space-y-2">
                  {receipt.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.quantity} × {item.price.toFixed(2)} ₴
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
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

              <div className="flex items-center justify-between pt-4 text-lg font-bold">
                <span>Всього:</span>
                <span>{total.toFixed(2)} ₴</span>
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
                Завершити продаж
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
