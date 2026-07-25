"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { ShoppingCart, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "~/lib/utils/format";
import type { Warehouse } from "~/lib/types";
import type { ReceiptItem } from "./actions";

interface POSReceiptPanelProps {
  warehouses: Warehouse[];
  selectedWarehouse: number | null;
  onWarehouseChange: (value: number | null) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  receipt: ReceiptItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  total: number;
  onSubmit: () => void;
  submitting: boolean;
}

export function POSReceiptPanel({
  warehouses,
  selectedWarehouse,
  onWarehouseChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  receipt,
  onUpdateQuantity,
  onRemoveItem,
  total,
  onSubmit,
  submitting,
}: POSReceiptPanelProps) {
  const t = useTranslations("pos");

  return (
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
            <Label htmlFor="pos-warehouse" className="text-xs text-muted-foreground mb-1 block">
              {t("warehouse")}
            </Label>
            <Select
              value={selectedWarehouse ? String(selectedWarehouse) : ""}
              onValueChange={(v) => onWarehouseChange(v ? Number(v) : null)}
            >
              <SelectTrigger id="pos-warehouse" className="w-full">
                <SelectValue placeholder={t("selectWarehouse")} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={String(wh.id)}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pos-customer-name" className="text-xs text-muted-foreground mb-1 block">
              {t("customerName")}
            </Label>
            <Input
              id="pos-customer-name"
              placeholder={t("customerName")}
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="pos-customer-phone" className="text-xs text-muted-foreground mb-1 block">
              {t("customerPhone")}
            </Label>
            <Input
              id="pos-customer-phone"
              placeholder={t("customerPhone")}
              value={customerPhone}
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
            />
          </div>

          <div className="border-t dark:border-border pt-4">
            {receipt.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">{t("emptyReceipt")}</div>
            ) : (
              <div className="space-y-2">
                {receipt.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between py-2 border-b dark:border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} &times; {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.product_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => onRemoveItem(item.product_id)}
                      >
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
              onClick={onSubmit}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("submitSale")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
