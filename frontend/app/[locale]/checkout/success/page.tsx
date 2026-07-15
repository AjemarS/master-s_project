"use client";

import { Suspense } from "react";
import { Link } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { CheckCircle, ShoppingBag, ArrowRight, Package, UserPlus } from "lucide-react";
import { useCurrentUser } from "~/lib/auth-client";

function SuccessContent() {
  const t = useTranslations("checkoutSuccess");
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-16 w-16 mx-auto mb-2 text-green-500" />
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-base">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orderId && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                <Package className="h-4 w-4 inline mr-1" />
                {t("orderNumber", { id: orderId })}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
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

      {user?.isAnonymous && (
        <Card className="w-full max-w-md border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="flex flex-col gap-3 pt-6 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-amber-500" />
            <CardTitle className="text-lg">{t("saveOrder")}</CardTitle>
            <CardDescription>{t("saveOrderDesc")}</CardDescription>
            <Button asChild className="w-full">
              <Link href="/sign-up">{t("createAccount")} <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}
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
