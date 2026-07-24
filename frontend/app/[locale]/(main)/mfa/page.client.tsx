"use client";

import { useRouter } from "~/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { twoFactor } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Switch } from "~/ui/primitives/switch";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/ui/primitives/input-otp";

export function TwoFactorPageClient() {
  const t = useTranslations("mfa");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isUsingBackupCode) {
        await twoFactor.verifyBackupCode({ code, trustDevice });
      } else {
        await twoFactor.verifyTotp({ code, trustDevice });
      }
      router.push("/");
    } catch (err) {
      setError(isUsingBackupCode ? t("backupCodeError") : t("errorInvalidCode"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerificationMethod = () => {
    setIsUsingBackupCode(!isUsingBackupCode);
    setCode("");
    setError("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-sm">
          <CardHeader className="text-center">
            <CardTitle role="heading" aria-level={1}>{t("pageTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("pageSubtitle")}
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <form className="space-y-6" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Label htmlFor="code">
                  {isUsingBackupCode ? t("backupCodeLabel") : t("totpLabel")}
                </Label>
                {isUsingBackupCode ? (
                  <Input
                    id="code"
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("backupCodePlaceholder")}
                    required
                    type="text"
                    value={code}
                  />
                ) : (
                  <InputOTP
                    id="code"
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    autoFocus
                  >
                    <InputOTPGroup className="w-full justify-center">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              </div>

              {!isUsingBackupCode && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={trustDevice}
                    id="trustDevice"
                    onCheckedChange={(checked) => {
                      setTrustDevice(checked);
                    }}
                  />
                  <Label htmlFor="trustDevice">{t("trustDevice")}</Label>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button disabled={loading || (isUsingBackupCode ? !code : code.length !== 6)} type="submit">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? t("verifying") : t("verify")}
                </Button>

                <Button
                  onClick={toggleVerificationMethod}
                  type="button"
                  variant="link"
                >
                  {isUsingBackupCode
                    ? t("useAuthenticator")
                    : t("useBackupCode")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
