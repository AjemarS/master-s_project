"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";

interface GuestPromptProps {
  pendingCheckoutUrl: string | null;
  onContinue: () => void;
  tChk: (key: string) => string;
}

export function GuestPrompt({
  pendingCheckoutUrl,
  onContinue,
  tChk,
}: GuestPromptProps) {
  if (!pendingCheckoutUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-4">
          <ShoppingBag className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-lg font-semibold">{tChk("saveTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {tChk("createAccountPrompt")}
          </p>
          <Button className="w-full" onClick={onContinue}>
            {tChk("continueButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
