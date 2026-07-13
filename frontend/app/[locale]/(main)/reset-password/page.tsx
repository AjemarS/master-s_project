"use client";

import { useState, Suspense } from "react";
import { Link } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { CheckCircle, Lock } from "lucide-react";

function ResetForm() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError(t("errorMismatch")); return; }
    if (password.length < 8) { setError(t("errorMinLength")); return; }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result?.error) {
        setError(result.error.message || t("errorReset"));
      } else {
        setDone(true);
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{t("invalidLinkTitle")}</CardTitle>
          <CardDescription>{t("invalidLinkMessage")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/forgot-password">{t("requestNewLink")}</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <CardTitle>{t("successTitle")}</CardTitle>
          <CardDescription>{t("successMessage")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/sign-in">{t("signInButton")}</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Lock className="h-10 w-10 mb-2 text-primary" />
        <CardTitle>{t("pageTitle")}</CardTitle>
        <CardDescription>{t("pageSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rp-password">{t("newPasswordLabel")}</Label>
            <Input id="rp-password" type="password" placeholder={t("newPasswordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="rp-confirm">{t("confirmPasswordLabel")}</Label>
            <Input id="rp-confirm" type="password" placeholder={t("confirmPasswordPlaceholder")} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
            {loading ? t("resetting") : t("resetButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div>{t("loading")}</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
