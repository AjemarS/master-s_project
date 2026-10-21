"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, Suspense, useCallback, useEffect } from "react";
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
import { PromoCode, type AppliedPromo } from "./components/promo-code";
import { apiErrorText } from "~/lib/utils/error-handler";
import { formatCurrency } from "~/lib/utils/format";
import { orderApi } from "~/lib/api/admin-api";
import { authClient, useCurrentUser, type User as AuthUser } from "~/lib/auth-client";
import { formatPhone, normalizePhoneDigits, isValidPhone, MAX_PHONE_DIGITS } from "~/lib/utils/phone";

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
  SaveDetails,
  CheckoutEmpty,
} from "./components";
import { EMAIL_RE, getSectionStatuses, type SectionStatus } from "./components/section-status";
import { StatusDot } from "./components/status-dot";

const SECTION_ORDER = [
  "city", "info", "delivery", "receiver", "confirmation", "comment",
] as const;


interface WarehouseOption {
  name: string;
  address: string;
  ref?: string;
}

interface PriceSummaryProps {
  items: CartItem[];
  subtotal: number;
  /** false = pickup (free); true = paid to the carrier on receipt, not part of this total */
  deliveryByCarrier: boolean;
  promo: AppliedPromo | null;
  onPromoChange: (promo: AppliedPromo | null) => void;
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
  deliveryByCarrier,
  promo,
  onPromoChange,
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
            <span>{deliveryByCarrier ? summaryTChk("deliveryByCarrier") : summaryTChk("freeDelivery")}</span>
          </div>
          {promo && promo.discount > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>{summaryTChk("promoDiscount", { code: promo.code })}</span>
              <span>−{formatCurrency(promo.discount, summaryLocale)}</span>
            </div>
          )}
        </div>

        <PromoCode subtotal={summarySubtotal} applied={promo} onChange={onPromoChange} />

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

// ── Validation utility ────────────────────────────────────────────────

const validateField = (field: string, value: string, tChk: (key: string) => string): string => {
  switch (field) {
    case "name":
      return value.trim().length < 2 ? tChk("nameRequired") : "";
    case "email":
      return !EMAIL_RE.test(value.trim()) ? tChk("emailInvalid") : "";
    case "phone":
      return isValidPhone(value) ? "" : tChk("phoneInvalid");
    default:
      return "";
  }
};

// ── Auth gate ───────────────────────────────────────────────────────────

function CheckoutGate() {
  const { user, isPending } = useCurrentUser();
  const [resolvedUser, setResolvedUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    if (!isPending && resolvedUser === undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time auth latch; must mount CheckoutContent only after first session resolution so useState(user?.name) initializers see real user
      setResolvedUser(user ?? null);
    }
  }, [isPending, user, resolvedUser]);

  if (resolvedUser === undefined) {
    return (
      <div className="min-h-dvh bg-muted/50 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <CheckoutContent user={resolvedUser} />;
}

// ── Checkout content ──────────────────────────────────────────────────

function CheckoutContent({ user }: { user: AuthUser | null }) {
  const tChk = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, subtotal, clearCart, updateQuantity } = useCart();
  const orderId = searchParams.get("order_id");

  const [expandedSection, setExpandedSection] = useState<string | null>("city");
  const [city, setCity] = useState("");
  const [cityRef, setCityRef] = useState<string | null>(null);
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saveNamePhone, setSaveNamePhone] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);
  const [, setCreatedOrderId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedShowroomId, setSelectedShowroomId] = useState<number | null>(null);


  // The carrier is paid on receipt: what we charge (and Stripe bills) is the goods only
  const deliveryByCarrier = deliveryType !== "pickup";
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const total = subtotal - (promo?.discount ?? 0);

  // ── Derived delivery state ─────────────────────────────────────────────

  const deliveryFilled =
    deliveryType === "pickup"
      ? selectedShowroomId !== null
      : (deliveryType !== "pickup" && deliveryBranch.trim().length > 0) ||
        (deliveryType === "other_courier" && otherDeliveryService.trim().length > 0);

  const sectionStatuses = getSectionStatuses({
    city,
    name,
    email,
    phone,
    deliveryType,
    deliveryBranch,
    otherDeliveryService,
    selectedShowroomId,
    isSelfReceiver,
    receiverName,
    receiverPhone,
    callToConfirm,
    comment,
    fieldErrors,
    submitAttempted,
  });

  const statusLabel = (status: SectionStatus): string =>
    tChk(
      status === "filled"
        ? "statusFilled"
        : status === "partial"
          ? "statusPartial"
          : status === "error"
            ? "statusError"
            : "statusEmpty",
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

  const handleNameChange = (value: string) => {
    setName(value);
    setFieldErrors((prev) => ({ ...prev, name: "" }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setFieldErrors((prev) => ({ ...prev, email: "" }));
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > MAX_PHONE_DIGITS) return;
    setPhone(digits);
    setFieldErrors((prev) => ({ ...prev, phone: "" }));
  };

  const handlePhoneBlur = () => {
    if (phone) {
      setPhone(formatPhone(phone));
    }
    handleBlur("phone", phone);
  };

  const handleReceiverPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > MAX_PHONE_DIGITS) return;
    setReceiverPhone(digits);
  };

  const handleReceiverPhoneBlur = () => {
    if (receiverPhone) {
      setReceiverPhone(formatPhone(receiverPhone));
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error(tChk("emptyCart"));
      return;
    }

    const guardStatuses = getSectionStatuses({
      city, name, email, phone, deliveryType, deliveryBranch, otherDeliveryService,
      selectedShowroomId, isSelfReceiver, receiverName, receiverPhone,
      callToConfirm, comment, fieldErrors,
      submitAttempted: true,
    });
    const firstErrored = SECTION_ORDER.find((s) => guardStatuses[s] === "error");
    if (firstErrored) {
      setSubmitAttempted(true);
      setExpandedSection(firstErrored);
      toast.error(tChk("fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const recipientName = isSelfReceiver ? name : receiverName;
      const recipientPhone = isSelfReceiver ? phone : receiverPhone;

      const actualDeliveryMethod =
        deliveryType === "other_courier" ? otherDeliveryService : deliveryType;
      const shippingAddress = deliveryBranch.trim();

      const notesParts: string[] = [];
      if (comment.trim()) notesParts.push(comment.trim());
      if (callToConfirm) notesParts.push("Потрібен дзвінок для підтвердження");

      const order = await orderApi.create({
        channel: "online",
        customer_name: recipientName.trim(),
        customer_email: email.trim(),
        customer_phone: normalizePhoneDigits(recipientPhone),
        delivery_method: actualDeliveryMethod,
        warehouse_id: deliveryType === "pickup" ? selectedShowroomId ?? undefined : undefined,
        shipping_city: city.trim(),
        shipping_address: shippingAddress,
        notes: notesParts.join(" | "),
        promo_code: promo?.code,
        items: items.map((i) => ({
          product_id: Number(i.id),
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      if (order.error) {
        toast.error(tChk("createError"), { description: apiErrorText(order.error) });
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

      const pay = await orderApi.pay(newOrderId, order.data.pay_token);
      if (pay.error) {
        router.push(`/checkout?order_id=${newOrderId}`);
        return;
      }

      if (!pay.data) {
        toast.error(tChk("createError"));
        setSubmitting(false);
        return;
      }
      if (user) await saveDetails();
      // Straight to payment: a modal here would interrupt a buyer who already chose to pay
      window.location.assign(pay.data.checkout_url);
    } catch (err) {
      toast.error(tCommon("error"), {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
      setSubmitting(false);
    }
  };

  const saveDetails = async () => {
    if (!saveNamePhone && !saveAddress) return;
    try {
      const recipientName = isSelfReceiver ? name : receiverName;
      const recipientPhone = isSelfReceiver ? phone : receiverPhone;

      const fieldsToUpdate: Record<string, string> = {};
      if (saveNamePhone) {
        fieldsToUpdate.name = recipientName;
        fieldsToUpdate.phone = normalizePhoneDigits(recipientPhone);
      }
      if (saveAddress) {
        fieldsToUpdate.address = deliveryBranch;
        fieldsToUpdate.city = city;
      }
      await authClient.updateUser(fieldsToUpdate);
    } catch {
      // Silently fail — user data save is optional
    }
  };

  const handleAccordionChange = (value: string | undefined) => {
    // Radix single-collapsible emits "" on collapse; "" and null both mean "closed"
    setExpandedSection(value || null);
  };

  const handleNextSection = () => {
    const idx = SECTION_ORDER.findIndex((s) => s === expandedSection);
    const next = SECTION_ORDER[idx + 1];
    if (next) setExpandedSection(next);
  };

  const handleWarehouseSelect = (warehouse: WarehouseOption) => {
    const label = warehouse.name || warehouse.address || "";
    setDeliveryBranch(label);
  };

  const handleShowroomSelect = (id: number, label: string) => {
    setSelectedShowroomId(id);
    setDeliveryBranch(label);
  };

  const handleDeliveryTypeChange = (val: string) => {
    setDeliveryType(val);
    setDeliveryBranch("");
    setOtherDeliveryService("");
    setSelectedShowroomId(null);
  };

  const handleCitySelect = (name: string, ref: string) => {
    setCity(name);
    setCityRef(ref);
    setCityOpen(false);
    setDeliveryBranch("");
    setSelectedShowroomId(null);
    setExpandedSection("info");
  };

  // ── Early returns ───────────────────────────────────────────────────────

  if (orderId) {
    return (
      <div className="min-h-dvh bg-muted/50 flex items-center justify-center p-8">
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

  const disabled = submitting || items.length === 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background">
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
                expandedSections={expandedSection ? [expandedSection] : []}
                statuses={sectionStatuses}
                labelOf={(sec) => tChk({ city: "cityLabel", info: "personalInfo", delivery: "delivery", receiver: "receiver", confirmation: "callToConfirm", comment: "comment" }[sec])}
                statusLabel={(st) => tChk(`step_${st}`)}
                ariaLabel={tChk("stepsLabel")}
              />

              {/* Accordion sections */}
              <Accordion
                type="single"
                collapsible
                value={expandedSection ?? ""}
                onValueChange={handleAccordionChange}
              >
                {/* 1. City section */}
                <AccordionItem value="city">
                  <AccordionTrigger
                    className="hover:no-underline"
                    headerClassName="sticky top-0 z-10 bg-background/95 backdrop-blur"
                    trailing={<StatusDot status={sectionStatuses["city"]} label={statusLabel(sectionStatuses["city"])} />}
                  >
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
                  <AccordionTrigger
                    className="hover:no-underline"
                    trailing={<StatusDot status={sectionStatuses["info"]} label={statusLabel(sectionStatuses["info"])} />}
                  >
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
                          onNameChange={handleNameChange}
                          onEmailChange={handleEmailChange}
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
                          disabled={!name.trim() || !email.trim() || !isValidPhone(phone)}
                        >
                          {tChk("nextStep")}
                        </Button>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Delivery section */}
                <AccordionItem value="delivery">
                  <AccordionTrigger
                    className="hover:no-underline"
                    trailing={<StatusDot status={sectionStatuses["delivery"]} label={statusLabel(sectionStatuses["delivery"])} />}
                  >
                    <span className="flex items-center gap-2 font-semibold text-base">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {tChk("delivery")}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <DeliveryMethod
                          deliveryType={deliveryType}
                          onDeliveryTypeChange={handleDeliveryTypeChange}
                          deliveryBranch={deliveryBranch}
                          onDeliveryBranchChange={setDeliveryBranch}
                          otherDeliveryService={otherDeliveryService}
                          onOtherServiceChange={setOtherDeliveryService}
                          city={city}
                          cityRef={cityRef}
                          selectedShowroomId={selectedShowroomId}
                          onShowroomSelect={handleShowroomSelect}
                          onWarehouseSelect={handleWarehouseSelect}
                          tChk={tChk}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNextSection}
                          disabled={!deliveryFilled}
                        >
                          {tChk("nextStep")}
                        </Button>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Receiver section */}
                <AccordionItem value="receiver">
                  <AccordionTrigger
                    className="hover:no-underline"
                    trailing={<StatusDot status={sectionStatuses["receiver"]} label={statusLabel(sectionStatuses["receiver"])} />}
                  >
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
                          onPhoneChange={handleReceiverPhoneChange}
                          onPhoneBlur={handleReceiverPhoneBlur}
                          tChk={tChk}
                        />
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Confirmation section */}
                <AccordionItem value="confirmation">
                  <AccordionTrigger
                    className="hover:no-underline"
                    trailing={<StatusDot status={sectionStatuses["confirmation"]} label={statusLabel(sectionStatuses["confirmation"])} />}
                  >
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
                  <AccordionTrigger
                    className="hover:no-underline"
                    trailing={<StatusDot status={sectionStatuses["comment"]} label={statusLabel(sectionStatuses["comment"])} />}
                  >
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
              <div className="lg:sticky lg:top-24 space-y-4">
                {user && (
                  <SaveDetails
                    saveNamePhone={saveNamePhone}
                    saveAddress={saveAddress}
                    onNamePhoneChange={setSaveNamePhone}
                    onAddressChange={setSaveAddress}
                    tChk={tChk}
                  />
                )}
                <PriceSummary
                  items={items}
                  subtotal={subtotal}
                  deliveryByCarrier={deliveryByCarrier}
                  promo={promo}
                  onPromoChange={setPromo}
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

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh">Loading...</div>}>
      <CheckoutGate />
    </Suspense>
  );
}
