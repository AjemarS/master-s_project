"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { Badge } from "~/ui/primitives/badge";
import { Shield, ShieldOff } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "~/i18n/navigation";

export function ImpersonationBadge() {
  const [stopping, setStopping] = useState(false);
  const router = useRouter();
  const t = useTranslations("impersonation");

  // Check if currently impersonating via Better Auth session
  // The admin plugin returns isImpersonated on the session
  const session = authClient.useSession();
  const isImpersonating = session.data?.session?.impersonatedBy || false;

  if (!isImpersonating) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      router.refresh();
    } catch {
      // Fallback: redirect to root
      window.location.href = "/";
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
      <Shield className="h-4 w-4" />
      <span>{t("badge")}</span>
      <Badge variant="outline" className="border-white/30 text-white text-xs">
        {session.data?.user?.name || session.data?.user?.email || t("otherUser")}
      </Badge>
      <Button
        variant="outline"
        size="sm"
        className="border-white/30 text-white hover:bg-amber-600 hover:text-white"
        onClick={handleStop}
        disabled={stopping}
      >
        <ShieldOff className="h-3 w-3 mr-1" />
        {stopping ? "..." : t("exit")}
      </Button>
    </div>
  );
}
