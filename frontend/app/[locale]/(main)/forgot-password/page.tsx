"use client";

import { useState } from "react";
import { Link } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (result?.error) {
        setError(result.error.message || t("errorSend"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>{t("successTitle")}</CardTitle>
            <CardDescription>{t("successMessage")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/sign-in">{t("backToSignIn")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("pageTitle")}</CardTitle>
          <CardDescription>{t("pageSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fp-email">{t("emailLabel")}</Label>
              <Input id="fp-email" type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? t("sending") : t("sendButton")}
            </Button>
          </form>
          <div className="mt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/sign-in"><ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSignIn")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
