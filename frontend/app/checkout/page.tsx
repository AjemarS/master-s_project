"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "~/lib/hooks/use-cart";
import { orderApi } from "~/lib/api/admin-api";
import { useCurrentUser } from "~/lib/auth-client";
import Link from "next/link";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const { items, total, clearCart } = useCart();
  const orderId = searchParams.get("order_id");

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderApi.create({
        channel: "online",
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        items: items.map((i) => ({
          product_id: Number(i.id),
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      if (order.error) {
        toast.error("Failed to create order", { description: order.error.message });
        setSubmitting(false);
        return;
      }

      const pay = await orderApi.pay(order.data!.id);
      if (pay.error) {
        toast.error("Failed to start payment", { description: pay.error.message });
        setSubmitting(false);
        return;
      }

      const checkoutUrl = pay.data!.checkout_url;
      router.push(checkoutUrl);
      clearCart();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Something went wrong" });
      setSubmitting(false);
    }
  };

  if (orderId) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-purple-600" />
            <CardTitle>Returning to order</CardTitle>
            <CardDescription>Continue with your existing order #{orderId}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/orders`)}>
              View Order Status
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Store</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Store
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Review your order and complete payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                Your cart is empty
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-slate-600">Order Items</h3>
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="font-medium">{(item.price * item.quantity).toFixed(2)} ₴</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{total.toFixed(2)} ₴</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-slate-600">Customer Details</h3>
                  <div>
                    <Label htmlFor="co-name">Name *</Label>
                    <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="co-email">Email *</Label>
                    <Input id="co-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="co-phone">Phone</Label>
                    <Input id="co-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    `Pay ${total.toFixed(2)} ₴`
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
