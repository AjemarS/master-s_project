"use client";

import { Suspense } from "react";
import { Link } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-16 w-16 mx-auto mb-2 text-green-500" />
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your order has been placed and payment confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orderId && (
            <p className="text-sm text-slate-500 mb-2">
              Order #{orderId} — you will receive a confirmation email shortly.
            </p>
          )}
          <Button asChild className="w-full">
            <Link href={`/order/${orderId}`}>
              View Order Details <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              <ShoppingBag className="h-4 w-4 mr-2" /> Continue Shopping
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
