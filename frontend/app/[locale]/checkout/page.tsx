"use client";

import { useTranslations } from "next-intl";
import { useState, Suspense } from "react";
import { useRouter } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "~/lib/hooks/use-cart";
import { formatCurrency } from "~/lib/utils/format";
import { orderApi } from "~/lib/api/admin-api";
import { useCurrentUser } from "~/lib/auth-client";
import Link from "next/link";

function CheckoutContent() {
  const tChk = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isPending: authPending } = useCurrentUser();
  const { items, subtotal, clearCart } = useCart();
  const orderId = searchParams.get("order_id");

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error(tChk("emptyCart"));
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderApi.create({
        channel: "online",
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        delivery_method: deliveryMethod,
        shipping_city: shippingCity.trim(),
        shipping_address: shippingAddress.trim(),
        items: items.map((i) => ({
          product_id: Number(i.id),
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      if (order.error) {
        toast.error(tChk("createError"), { description: order.error.message });
        setSubmitting(false);
        return;
      }

      const newOrderId = order.data!.id;
      clearCart();

      // If email provided, proceed to Stripe payment
      if (email.trim()) {
        const pay = await orderApi.pay(newOrderId);
        if (pay.error) {
          // Order created but payment link failed — redirect to order page
          router.push(`/checkout?order_id=${newOrderId}`);
          return;
        }
        const checkoutUrl = pay.data!.checkout_url;
        window.location.href = checkoutUrl;
      } else {
        // No email — redirect to success page with order ID
        router.push(`/checkout/success?order_id=${newOrderId}`);
      }
    } catch (err) {
      toast.error(tCommon("error"), { description: err instanceof Error ? err.message : "Something went wrong" });
      setSubmitting(false);
    }
  };

  if (authPending) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>{tChk("returningToOrder")}</CardTitle>
            <CardDescription>{tChk("continueOrder", { id: orderId })}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/order/${orderId}`)}>
              {tChk("viewStatus")}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">{tChk("backToStore")}</Link>
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
            {tChk("backToStore")}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{!user ? tChk("guestTitle") : tChk("title")}</CardTitle>
            <CardDescription>{!user ? tChk("guestDesc") : tChk("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                {tChk("emptyCart")}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-slate-600">{tChk("orderItems")}</h3>
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>{tChk("total")}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-slate-600">{tChk("customerDetails")}</h3>
                  <div>
                    <Label htmlFor="co-name">{user ? tChk("nameLabel") : tChk("guestName")}</Label>
                    <Input
                      id="co-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={user ? "" : tChk("guestNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="co-email">{user ? tChk("emailLabel") : tChk("guestEmail")}</Label>
                    <Input
                      id="co-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={user ? "" : tChk("guestEmailPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="co-phone">{tChk("phoneLabel")}</Label>
                    <Input id="co-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-slate-600">{tChk("delivery")}</h3>
                  <div>
                    <Label htmlFor="co-delivery">{tChk("deliveryMethod")}</Label>
                    <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                      <SelectTrigger id="co-delivery"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">{tChk("pickup")}</SelectItem>
                        <SelectItem value="nova_poshta">{tChk("novaPoshta")}</SelectItem>
                        <SelectItem value="courier">{tChk("courier")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {deliveryMethod !== "pickup" && (
                    <>
                      <div>
                        <Label htmlFor="co-city">{tChk("shippingCity")}</Label>
                        <Input id="co-city" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="co-address">
                          {deliveryMethod === "nova_poshta" ? tChk("novaPoshtaOffice") : tChk("shippingAddress")}
                        </Label>
                        <Input id="co-address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {tChk("processing")}</>
                  ) : (
                    tChk("pay", { amount: subtotal.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
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

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
