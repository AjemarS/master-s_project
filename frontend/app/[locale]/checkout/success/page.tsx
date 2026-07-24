"use client";

import { Suspense } from "react";
import { Link } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { CheckCircle, ShoppingBag, ArrowRight, Package } from "lucide-react";
function SuccessContent() {
  const t = useTranslations("checkoutSuccess");
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-16 w-16 mx-auto mb-2 text-primary" />
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-base">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orderId && (
            <div className="bg-primary/10 dark:bg-primary/15 rounded-lg p-4 mb-2">
              <p className="text-sm font-medium text-primary dark:text-primary">
                <Package className="h-4 w-4 inline mr-1" />
                {t("orderNumber", { id: orderId })}
              </p>
              <p className="text-xs text-primary/80 dark:text-primary/80 mt-1">
                {t("confirmationEmail")}
              </p>
            </div>
          )}
          {orderId && (
            <Button asChild className="w-full">
              <Link href={`/order/${orderId}`}>
                {t("viewOrder")} <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              <ShoppingBag className="h-4 w-4 mr-2" /> {t("continueShopping")}
            </Link>
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
