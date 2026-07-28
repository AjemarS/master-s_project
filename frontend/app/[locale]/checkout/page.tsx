"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, Suspense, useRef, useCallback } from "react";
import { useRouter } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ShoppingBag, Loader2, MapPin, User, MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "~/ui/primitives/accordion";
import { useCart } from "~/lib/hooks/use-cart";
import { formatCurrency } from "~/lib/utils/format";
import { orderApi } from "~/lib/api/admin-api";
import { useCurrentUser, authClient } from "~/lib/auth-client";

import type { CartItem } from "~/lib/hooks/use-cart";

import {
  CheckoutHeader,
  BackLink,
  CartItems,
  StepIndicator,
  CitySelector,
  PersonalInfoForm,
  DeliveryMethod,
  ReceiverForm,
  ConfirmationSection,
  CommentSection,
  SaveDialog,
  GuestPrompt,
  CheckoutEmpty,
} from "./components";

const SECTION_ORDER = [
  "city", "info", "delivery", "receiver", "confirmation", "comment",
] as const;

const DELIVERY_COST = 100;

interface WarehouseOption {
  name: string;
  address: string;
  ref?: string;
}

interface PriceSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  locale: string;
  disabled: boolean;
  submitting: boolean;
  tChk: (key: string, args?: Record<string, string | number>) => string;
  handleSubmit: () => Promise<void>;
}

function PriceSummary({
  items: summaryItems,
  subtotal: summarySubtotal,
  deliveryCost: summaryDeliveryCost,
  total: summaryTotal,
  locale: summaryLocale,
  disabled: summaryDisabled,
  submitting: summarySubmitting,
  tChk: summaryTChk,
  handleSubmit: summaryHandleSubmit,
}: PriceSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{summaryTChk("orderSummary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {summaryItems.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="truncate text-muted-foreground">
                {item.name}{" "}
                <span className="text-foreground">×{item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">
                {formatCurrency(item.price * item.quantity, summaryLocale)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{summaryTChk("subtotal")}</span>
            <span>{formatCurrency(summarySubtotal, summaryLocale)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{summaryTChk("deliveryCost")}</span>
            <span>
              {summaryDeliveryCost === 0
                ? summaryTChk("freeDelivery")
                : formatCurrency(summaryDeliveryCost, summaryLocale)}
            </span>
          </div>
        </div>

        <div className="border-t pt-3 flex justify-between font-bold text-base">
          <span>{summaryTChk("total")}</span>
          <span>{formatCurrency(summaryTotal, summaryLocale)}</span>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={summaryHandleSubmit}
          disabled={summaryDisabled}
        >
          {summarySubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {summaryTChk("processing")}
            </>
          ) : (
            summaryTChk("confirmOrder")
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Phone formatting utility ──────────────────────────────────────────

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  let clean = digits;
  if (!clean.startsWith("380")) clean = "380" + clean.replace(/^380?/, "");
  clean = clean.slice(0, 12);
  const match = clean.slice(3).match(/^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/);
  if (!match) return "+380 ";
  let formatted = "+380 ";
  if (match[1]) formatted += match[1];
  if (match[2]) formatted += " " + match[2];
  if (match[3]) formatted += " " + match[3];
  if (match[4]) formatted += " " + match[4];
  return formatted;
};

// ── Validation utility ────────────────────────────────────────────────

const validateField = (field: string, value: string, tChk: (key: string) => string): string => {
  switch (field) {
    case "name":
      return value.trim().length < 2 ? tChk("nameRequired") : "";
    case "email":
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? tChk("emailInvalid") : "";
    case "phone":
      return value.replace(/\D/g, "").length < 12 ? tChk("phoneInvalid") : "";
    default:
      return "";
  }
};

// ── Checkout content ──────────────────────────────────────────────────

function CheckoutContent() {
  const tChk = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isPending: authPending } = useCurrentUser();
  const { items, subtotal, clearCart, updateQuantity } = useCart();
  const orderId = searchParams.get("order_id");

  const [manuallyExpanded, setManuallyExpanded] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone as string) : "");
  const [deliveryType, setDeliveryType] = useState("pickup");
  const [deliveryBranch, setDeliveryBranch] = useState("");
  const [otherDeliveryService, setOtherDeliveryService] = useState("");
  const [isSelfReceiver, setIsSelfReceiver] = useState(true);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [callToConfirm, setCallToConfirm] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveNamePhone, setSaveNamePhone] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setCreatedOrderId] = useState<number | null>(null);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  interface WarehouseFetchState {
    warehouses: WarehouseOption[];
    loading: boolean;
    error: boolean;
  }
  const [warehouseFetch, setWarehouseFetch] = useState<WarehouseFetchState>({
    warehouses: [],
    loading: false,
    error: false,
  });
  const [warehouseOpen, setWarehouseOpen] = useState(false);

  const checkoutUrlRef = useRef<string>("");

  const deliveryCost = deliveryType === "pickup" ? 0 : DELIVERY_COST;
  const total = subtotal + deliveryCost;

  // ── Derived expanded sections (manual + auto-progression) ─────────────

  const deliveryFilled =
    deliveryType === "pickup" ||
    (deliveryType !== "pickup" && deliveryBranch.trim().length > 0) ||
    (deliveryType === "other_courier" && otherDeliveryService.trim().length > 0);

  const expandedSections = (() => {
    const s = new Set(manuallyExpanded);
    if (city) s.add("info");
    if (name.trim() && email.trim() && phone.trim()) s.add("delivery");
    if (deliveryFilled) s.add("receiver");
    return Array.from(s);
  })();

  // ── Warehouse fetching (triggered from event handlers, not effects) ────

  const fetchWarehouses = useCallback(
    (cityName: string, deliveryMethod: string) => {
      if (!cityName || (deliveryMethod !== "nova_poshta" && deliveryMethod !== "ukrposhta")) {
        return;
      }

      setWarehouseFetch({ warehouses: [], loading: true, error: false });
      setDeliveryBranch("");

      const endpoint =
        deliveryMethod === "nova_poshta"
          ? "/api/orders/delivery/nova-poshta-warehouses/"
          : "/api/orders/delivery/ukrposhta-warehouses/";

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_name: cityName }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then((data) => {
          if (data.data && Array.isArray(data.data)) {
            setWarehouseFetch({ warehouses: data.data, loading: false, error: false });
          } else {
            throw new Error("Unexpected response format");
          }
        })
        .catch(() => {
          setWarehouseFetch({ warehouses: [], loading: false, error: true });
        });
    },
    [setWarehouseFetch, setDeliveryBranch],
  );

  // ── Callbacks ───────────────────────────────────────────────────────────

  const handleQuantityChange = useCallback(
    (productId: string, newQty: number) => {
      if (newQty < 1) return;
      updateQuantity(productId, newQty);
    },
    [updateQuantity],
  );

  const handleBlur = (field: string, value: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value, tChk) }));
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setPhone(digits);
  };

  const handlePhoneBlur = () => {
    if (phone) {
      setPhone(formatPhone(phone));
    }
    handleBlur("phone", phone);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error(tChk("emptyCart"));
      return;
    }

    setSubmitting(true);
    try {
      const recipientName = isSelfReceiver ? name : receiverName;
      const recipientPhone = isSelfReceiver ? phone : receiverPhone;

      const actualDeliveryMethod =
        deliveryType === "other_courier" ? otherDeliveryService : deliveryType;
      const shippingAddress =
        deliveryType === "pickup" ? "" : deliveryBranch.trim();

      const notesParts: string[] = [];
      if (comment.trim()) notesParts.push(comment.trim());
      if (callToConfirm) notesParts.push("Потрібен дзвінок для підтвердження");

      const order = await orderApi.create({
        channel: "online",
        customer_name: recipientName.trim(),
        customer_email: email.trim(),
        customer_phone: recipientPhone.trim(),
        delivery_method: actualDeliveryMethod,
        shipping_city: city.trim(),
        shipping_address: shippingAddress,
        notes: notesParts.join(" | "),
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

      if (!order.data) {
        toast.error(tChk("createError"));
        setSubmitting(false);
        return;
      }
      const newOrderId = order.data.id;
      clearCart();
      setCreatedOrderId(newOrderId);

      const pay = await orderApi.pay(newOrderId);
      if (pay.error) {
        router.push(`/checkout?order_id=${newOrderId}`);
        return;
      }

      if (!pay.data) {
        toast.error(tChk("createError"));
        setSubmitting(false);
        return;
      }
      const checkoutUrl = pay.data.checkout_url;

      if (user) {
        checkoutUrlRef.current = checkoutUrl;
        setShowSaveDialog(true);
        setSubmitting(false);
      } else {
        setPendingCheckoutUrl(checkoutUrl);
        setSubmitting(false);
      }
    } catch (err) {
      toast.error(tCommon("error"), {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const recipientName = isSelfReceiver ? name : receiverName;
      const recipientPhone = isSelfReceiver ? phone : receiverPhone;

      const fieldsToUpdate: Record<string, string> = {};
      if (saveNamePhone) {
        fieldsToUpdate.name = recipientName;
        fieldsToUpdate.phone = recipientPhone;
      }
      if (saveAddress) {
        fieldsToUpdate.address = deliveryBranch;
        fieldsToUpdate.city = city;
      }
      await authClient.updateUser(fieldsToUpdate);
    } catch {
      // Silently fail — user data save is optional
    }
    setSaving(false);
    window.location.href = checkoutUrlRef.current;
  };

  const handleSkip = () => {
    window.location.href = checkoutUrlRef.current;
  };

  const handleContinue = () => {
    if (pendingCheckoutUrl) {
      window.location.href = pendingCheckoutUrl;
    }
  };

  const handleAccordionChange = (values: string[]) => {
    setManuallyExpanded(values);
  };

  const handleNextSection = () => {
    const currentIndex = SECTION_ORDER.findIndex((s) => !expandedSections.includes(s));
    if (currentIndex === -1) return;
    const nextSection = SECTION_ORDER[currentIndex];
    if (nextSection && !expandedSections.includes(nextSection)) {
      setManuallyExpanded((prev) => [...prev, nextSection]);
    }
  };

  const handleWarehouseSelect = (warehouse: WarehouseOption) => {
    const label = warehouse.name || warehouse.address;
    setDeliveryBranch(label);
    setWarehouseOpen(false);
  };

  const handleDeliveryTypeChange = (val: string) => {
    setDeliveryType(val);
    setDeliveryBranch("");
    setOtherDeliveryService("");
    if (city && (val === "nova_poshta" || val === "ukrposhta")) {
      fetchWarehouses(city, val);
    }
  };

  const handleCitySelect = (c: string) => {
    setCity(c);
    setCityOpen(false);
    fetchWarehouses(c, deliveryType);
  };

  // ── Guard: auth pending ─────────────────────────────────────────────────

  if (authPending) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-8">
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

  const disabled =
    submitting ||
    items.length === 0 ||
    !name.trim() ||
    !email.trim() ||
    phone.replace(/\D/g, "").length < 12 ||
    !city.trim() ||
    (deliveryType !== "pickup" && !deliveryBranch.trim()) ||
    (deliveryType === "other_courier" && !otherDeliveryService) ||
    (!isSelfReceiver && (!receiverName.trim() || !receiverPhone.trim()));

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader tChk={tChk} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <BackLink tChk={tChk} />

        {items.length === 0 ? (
          <CheckoutEmpty tChk={tChk} />
        ) : (
          <div className="lg:flex lg:gap-8">
            {/* Left: products + accordion sections */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Products section — always visible, outside accordion */}
              <CartItems
                items={items}
                locale={locale}
                tChk={tChk}
                onQuantityChange={handleQuantityChange}
                formatCurrency={formatCurrency}
              />

              {/* Step indicator */}
              <StepIndicator
                sections={SECTION_ORDER}
                expandedSections={expandedSections}
                city={city}
                name={name}
                email={email}
                phone={phone}
                deliveryType={deliveryType}
                deliveryBranch={deliveryBranch}
                isSelfReceiver={isSelfReceiver}
                receiverName={receiverName}
                receiverPhone={receiverPhone}
              />

              {/* Accordion sections */}
              <Accordion
                type="multiple"
                value={expandedSections}
                onValueChange={handleAccordionChange}
              >
                {/* 1. City section */}
                <AccordionItem value="city">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {tChk("cityLabel")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4">
                        <CitySelector
                          city={city}
                          cityOpen={cityOpen}
                          onCityOpenChange={setCityOpen}
                          onCitySelect={handleCitySelect}
                          tChk={tChk}
                          tCommon={tCommon}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Personal info section */}
                <AccordionItem value="info">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      {tChk("personalInfo")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <PersonalInfoForm
                          name={name}
                          email={email}
                          phone={phone}
                          onNameChange={setName}
                          onEmailChange={setEmail}
                          onPhoneChange={handlePhoneChange}
                          errors={fieldErrors}
                  onBlur={(field) => {
                    if (field === "phone") {
                      handlePhoneBlur();
                    } else {
                      handleBlur(field, field === "name" ? name : email);
                    }
                  }}
                          tChk={tChk}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNextSection}
                          disabled={!name.trim() || !email.trim() || !phone.trim()}
                        >
                          {tChk("nextStep")}
                        </Button>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Delivery section */}
                <AccordionItem value="delivery">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {tChk("delivery")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4">
                        <DeliveryMethod
                          deliveryType={deliveryType}
                          onDeliveryTypeChange={handleDeliveryTypeChange}
                          deliveryBranch={deliveryBranch}
                          onDeliveryBranchChange={setDeliveryBranch}
                          otherDeliveryService={otherDeliveryService}
                          onOtherServiceChange={setOtherDeliveryService}
                          warehouseFetch={warehouseFetch}
                          warehouseOpen={warehouseOpen}
                          onWarehouseOpenChange={setWarehouseOpen}
                          onWarehouseSelect={handleWarehouseSelect}
                          tChk={tChk}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Receiver section */}
                <AccordionItem value="receiver">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      {tChk("receiver")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <ReceiverForm
                          isSelfReceiver={isSelfReceiver}
                          receiverName={receiverName}
                          receiverPhone={receiverPhone}
                          onSelfChange={setIsSelfReceiver}
                          onNameChange={setReceiverName}
                          onPhoneChange={setReceiverPhone}
                          tChk={tChk}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Confirmation section */}
                <AccordionItem value="confirmation">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {tChk("callToConfirm")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4">
                        <ConfirmationSection
                          callToConfirm={callToConfirm}
                          onChange={setCallToConfirm}
                          tChk={tChk}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 6. Comment section */}
                <AccordionItem value="comment">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                      {tChk("comment")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4">
                        <CommentSection
                          comment={comment}
                          onChange={setComment}
                          tChk={tChk}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right: PriceSummary sidebar */}
            <div className="lg:w-80 shrink-0 mt-6 lg:mt-0">
              <div className="lg:sticky lg:top-24">
                <PriceSummary
                  items={items}
                  subtotal={subtotal}
                  deliveryCost={deliveryCost}
                  total={total}
                  locale={locale}
                  disabled={disabled}
                  submitting={submitting}
                  tChk={tChk}
                  handleSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Save Dialog for logged-in users */}
      <SaveDialog
        open={showSaveDialog}
        saveNamePhone={saveNamePhone}
        saveAddress={saveAddress}
        onNamePhoneChange={setSaveNamePhone}
        onAddressChange={setSaveAddress}
        saving={saving}
        onSave={handleSave}
        onSkip={handleSkip}
        tChk={tChk}
      />

      {/* Inline prompt for non-logged-in users */}
      <GuestPrompt
        pendingCheckoutUrl={pendingCheckoutUrl}
        onContinue={handleContinue}
        tChk={tChk}
      />
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
