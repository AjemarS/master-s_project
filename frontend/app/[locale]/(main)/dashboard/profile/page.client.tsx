"use client";

import { Shield, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient, twoFactor, useCurrentUserOrRedirect } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";
import { toast } from "sonner";

export function ProfilePageClient() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { isPending, user } = useCurrentUserOrRedirect();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [secret, setSecret] = useState("");

  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const handleSendVerificationEmail = async () => {
    setVerifyingEmail(true);
    try {
      await authClient.sendVerificationEmail({ email: user?.email || "" });
      toast.success(t("verificationEmailSent"));
    } catch {
      toast.error(t("verificationEmailFailed"));
    } finally {
      setVerifyingEmail(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{tCommon("loading")}</h1>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authClient.updateUser({ name, image: undefined });
      toast.success(t("changesSaved"));
    } catch {
      toast.error(t("changesError"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEnableTwoFactor = () => {
    if (!password) {
      setError(t("passwordRequired"));
      return;
    }

    setError("");
    setLoading(true);

    twoFactor
      .enable({ password })
      .then((result) => {
        if ("data" in result && result.data) {
          const uri = result.data.totpURI;
          setQrCodeData(uri);

          if (typeof uri === "string" && uri.includes("secret=")) {
            const secretMatch = uri.split("secret=")[1];
            if (secretMatch) {
              const extractedSecret = secretMatch.split("&")[0];
              if (extractedSecret) {
                setSecret(extractedSecret);
              }
            }
          }

          setShowQrCode(true);
          setMessage(t("twoFactorEnabledMsg"));
        } else {
          setError(t("enableErrorFormat"));
        }
      })
      .catch((err: unknown) => {
        setError(t("enableError"));
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDisableTwoFactor = () => {
    if (!password) {
      setError(t("passwordRequired"));
      return;
    }

    setError("");
    setLoading(true);

    twoFactor
      .disable({ password })
      .then(() => {
        setMessage(t("twoFactorDisabledMsg"));
        setShowQrCode(false);
      })
      .catch((err: unknown) => {
        setError(t("disableError"));
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="container space-y-6 p-4 md:p-8">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <Tabs className="space-y-4" defaultValue="general">
        <TabsList>
          <TabsTrigger className="flex items-center gap-2" value="general">
            <User className="h-4 w-4" />
            {t("generalTab")}
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="security">
            <Shield className="h-4 w-4" />
            {t("securityTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("nameLabel")}</Label>
                <Input
                  defaultValue={user?.name || ""}
                  id="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input
                  defaultValue={user?.email || ""}
                  disabled
                  id="email"
                  placeholder={t("emailPlaceholder")}
                  type="email"
                />
              </div>
              <Button disabled={savingProfile} onClick={handleSaveProfile}>
                {savingProfile ? tCommon("loading") : t("saveChanges")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("emailVerified")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    user?.emailVerified ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-medium">
                  {user?.emailVerified ? t("emailVerified") : t("emailNotVerified")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.emailVerified ? t("emailVerifiedDesc") : t("emailNotVerifiedDesc")}
              </p>
              {!user?.emailVerified && (
                <Button disabled={verifyingEmail} onClick={handleSendVerificationEmail} variant="outline">
                  {verifyingEmail ? tCommon("loading") : t("sendVerificationEmail")}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="security">
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
          )}

          {showQrCode && qrCodeData && (
            <Card>
              <CardHeader>
                <CardTitle>{t("scanQrTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center">
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="QR Code for Two-Factor Authentication"
                      className="h-48 w-48"
                      src={qrCodeData}
                    />
                  }
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    {t("scanQrHint")}
                  </p>
                  {secret && (
                    <div className="mt-6 w-full">
                      <p className="text-sm font-medium">{t("manualCode")}</p>
                      <p className="mt-2 rounded-md bg-muted p-4 font-mono text-sm break-all">
                        {secret}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("twoFactorTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <Input
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordLabel")}
                  type="password"
                  value={password}
                />
                <p className="text-sm text-muted-foreground">{t("passwordHint")}</p>
              </div>

              <div className="flex space-x-4">
                <Button disabled={loading} onClick={handleEnableTwoFactor}>
                  {loading ? t("processing") : t("enableTwoFactor")}
                </Button>
                <Button disabled={loading} onClick={handleDisableTwoFactor} variant="destructive">
                  {loading ? t("processing") : t("disableTwoFactor")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("backupCodesTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/mfa">{t("backupCodesLink")}</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
