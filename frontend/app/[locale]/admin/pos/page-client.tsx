"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { useWarehouses, useWarehouseStock, useSearchProducts } from "~/lib/hooks/use-api-data";
import { CreditCard } from "lucide-react";
import { AdminPageHeader } from "../components";
import type { Product, Warehouse } from "~/lib/types";
import { POSProductGrid } from "./pos-product-grid";
import { POSReceiptPanel } from "./pos-receipt-panel";
import { POSSaleConfirmDialog } from "./pos-sale-confirm-dialog";
import { posService, type ReceiptItem } from "./actions";
import { useActivityFeed } from "../components/activity-feed";

export function POSClient() {
  const { pushEvent } = useActivityFeed();

  const t = useTranslations("pos");
  const tc = useTranslations("common");
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [receipt, setReceipt] = useState<ReceiptItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [showSaleConfirm, setShowSaleConfirm] = useState(false);

  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.results ?? [];

  const { data: stockData, error: stockError } = useWarehouseStock(selectedWarehouse);

  const { data: searchData, isValidating: searchLoading, error: searchError } = useSearchProducts(debouncedSearchTerm, 20);

  useEffect(() => {
    if (searchError) {
      toast.error(t("searchError"));
    }
  }, [searchError, t]);

  const stockByProduct = useMemo(() => {
    if (!selectedWarehouse) return null;
    if (stockData === undefined) return null;
    return new Map(stockData.map((s) => [s.product_id, s.available]));
  }, [selectedWarehouse, stockData]);

  const products = useMemo(
    () =>
      (searchData?.results ?? []).map((p) => ({
        ...p,
        price: Number(p.price),
        original_price: Number(p.original_price),
        rating: Number(p.rating),
      })),
    [searchData]
  );

  // Auto-select the only warehouse once the list loads (adjusting state during
  // render, per React docs, instead of an effect — avoids cascade re-renders).
  const [prevWarehouseResults, setPrevWarehouseResults] = useState<Warehouse[] | undefined>(undefined);
  const warehouseResults = warehousesData?.results;
  if (prevWarehouseResults !== warehouseResults) {
    setPrevWarehouseResults(warehouseResults);
    if (selectedWarehouse === null && warehouseResults?.length === 1) {
      setSelectedWarehouse(warehouseResults[0].id);
    }
  }

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
      const res = await posService.createOrder({
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
      pushEvent({ type: "create", message: `POS sale completed${customerName ? ` for ${customerName}` : ""}`, entityType: "order" });
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
          <POSProductGrid
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            products={products}
            filteredProducts={filteredProducts}
            selectedWarehouse={selectedWarehouse}
            stockByProduct={stockByProduct}
            stockError={stockError ? stockError.message || "Failed to load stock data" : null}
            loading={searchLoading}
            onAddToReceipt={addToReceipt}
          />

          <POSReceiptPanel
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onWarehouseChange={setSelectedWarehouse}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            receipt={receipt}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            total={total}
            onSubmit={handleCompleteSale}
            submitting={submitting}
          />
        </div>

        <POSSaleConfirmDialog
          open={showSaleConfirm}
          onOpenChange={setShowSaleConfirm}
          receipt={receipt}
          total={total}
          submitting={submitting}
          onConfirm={handleSaleConfirm}
        />
      </div>
    </div>
  );
}
