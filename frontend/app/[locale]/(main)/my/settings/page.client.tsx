"use client";

import {
  User,
  Shield,
  Bell,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Copy,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "~/i18n/navigation";
import { authClient, twoFactor, useCurrentUserOrRedirect } from "~/lib/auth-client";
import { notificationsApi } from "~/lib/api/notifications";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Switch } from "~/ui/primitives/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/ui/primitives/tabs";
import { Separator } from "~/ui/primitives/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";
import { Badge } from "~/ui/primitives/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/ui/primitives/dialog";
import QRCode from "react-qr-code";

const ORDER_PREF_TYPES = [
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
] as const;

export function SettingsClient() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const tCountries = useTranslations("countries");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const { isPending, user } = useCurrentUserOrRedirect("/sign-in");

  // ── Profile state ──────────────────────────────────────────────
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("ua");
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // ── Address state ───────────────────────────────────────────
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  // ── Password state ─────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── 2FA state ──────────────────────────────────────────────────
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);

  // ── 2FA enable state ────────────────────────────────────────────
  const [enable2FADialogOpen, setEnable2FADialogOpen] = useState(false);
  const [enableStep, setEnableStep] = useState(1); // 1=password, 2=verify, 3=backup codes
  const [enablePassword, setEnablePassword] = useState("");
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const totpSecret = totpURI ? new URL(totpURI).searchParams.get("secret") || "" : "";

  // ── Sessions state ─────────────────────────────────────────────
  const [revokingSessions, setRevokingSessions] = useState(false);

  // ── Notification prefs state ───────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of ORDER_PREF_TYPES) {
      init[`${t}_in_app`] = true;
    }
    init["marketing_in_app"] = true;
    return init;
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState<Record<string, boolean>>({});
  const isSavingNotif = useRef(false);

  // ── Initialise from user ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const u = user as { name?: string; address_line1?: string; address_line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
      setName(u.name || "");
      setAddressLine1(u.address_line1 || "");
      setAddressLine2(u.address_line2 || "");
      setAddressCity(u.city || "");
      setAddressState(u.state || "");
      setAddressPostalCode(u.postal_code || "");
      setAddressCountry(u.country || "");
    };
    init();
  }, [user]);

  // ── Load notification preferences ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setNotifLoading(true);
      const res = await notificationsApi.getPreferences(user.id);
      if (res.data) {
        const p: Record<string, boolean> = {};
        const d = res.data;
        const fields = [
          "order_confirmed_email",
          "order_confirmed_in_app",
          "order_shipped_email",
          "order_shipped_in_app",
          "order_delivered_email",
          "order_delivered_in_app",
          "order_cancelled_email",
          "order_cancelled_in_app",
          "marketing_email",
          "marketing_in_app",
        ] as const;
        for (const f of fields) {
          p[f] = d[f] === true;
        }
        setNotifPrefs(p);
      }
      setNotifLoading(false);
    })();
  }, [user]);

  // ── Helpers ────────────────────────────────────────────────────
  const twoFactorEnabled = user?.twoFactorEnabled || false;

  // ── Save Profile (combined) ───────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authClient.updateUser({ name, image: undefined });
      // Navigate to selected locale — full page reload needed for
      // next-intl server components to pick up the new locale.
      const currentLocale = window.location.pathname.match(/^\/([a-z]{2})/)?.[1] || "ua";
      if (currentLocale !== language) {
        const currentPath = window.location.pathname.replace(/^\/[a-z]{2}/, "");
        window.location.href = `/${language}${currentPath}`;
      } else {
        toast.success(t("changesSaved"));
        setSavingProfile(false);
      }
    } catch {
      toast.error(t("changesError"));
      setSavingProfile(false);
    }
  };

  // ── Save Address ────────────────────────────────────────────
  const handleSaveAddress = async () => {
    setSavingAddress(true);
    try {
      await authClient.updateUser({
        address_line1: addressLine1,
        address_line2: addressLine2,
        city: addressCity,
        state: addressState,
        postal_code: addressPostalCode,
        country: addressCountry,
      } as Record<string, string>);
      toast.success(t("changesSaved"));
      setAddressDialogOpen(false);
    } catch {
      toast.error(t("changesError"));
    } finally {
      setSavingAddress(false);
    }
  };

  // ── Send verification email ────────────────────────────────────
  const handleSendVerification = async () => {
    if (!user?.email) return;
    setVerifyingEmail(true);
    try {
      await authClient.sendVerificationEmail({ email: user.email });
      toast.success(tProfile("verificationEmailSent"));
    } catch {
      toast.error(tProfile("verificationEmailFailed"));
    } finally {
      setVerifyingEmail(false);
    }
  };

  // ── Change password ────────────────────────────────────────────
  const handleUpdatePassword = async () => {
    setPasswordError(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordError(t("passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      await authClient.changePassword({ currentPassword, newPassword });
      toast.success(t("passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(t("passwordError"));
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Two-Factor ─────────────────────────────────────────────────
  const handleStartEnable2FA = async () => {
    if (!enablePassword) {
      toast.error(tProfile("passwordRequired"));
      return;
    }
    setEnabling2FA(true);
    setEnableError(null);
    try {
      const result = await twoFactor.enable({ password: enablePassword });
      if (result?.data) {
        setTotpURI(result.data.totpURI || "");
        setBackupCodes(result.data.backupCodes || []);
        setEnableStep(2);
      } else {
        setEnableError(tProfile("enableError"));
      }
    } catch (err: unknown) {
      setEnableError(err instanceof Error ? err.message : tProfile("enableError"));
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode) return;
    setVerifyingCode(true);
    setEnableError(null);
    try {
      const result = await twoFactor.verifyTotp({ code: verifyCode });
      if (!result?.error) {
        setEnableStep(3);
        await authClient.$fetch?.("/me/refresh");
      } else {
        setEnableError(tProfile("invalidCode"));
      }
    } catch {
      setEnableError(tProfile("invalidCode"));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success(t("backupCodesCopied"));
    } catch {
      toast.error(t("changesError"));
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error(tProfile("passwordRequired"));
      return;
    }
    setDisabling2FA(true);
    try {
      await twoFactor.disable({ password: twoFactorPassword });
      toast.success(tProfile("twoFactorDisabledMsg"));
      setTwoFactorPassword("");
      // Refresh user state
      await authClient.$fetch?.("/me/refresh");
    } catch {
      toast.error(tProfile("disableError"));
    } finally {
      setDisabling2FA(false);
    }
  };

  // ── Sessions ───────────────────────────────────────────────────
  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (authClient as any).revokeOtherSessions?.();
      toast.success(t("sessionsRevoked"));
    } catch {
      toast.error(t("changesError"));
    } finally {
      setRevokingSessions(false);
    }
  };

  // ── Notification toggles ───────────────────────────────────────
  const handleToggleNotif = async (
    updates: Record<string, boolean>,
    groupKey: string,
  ) => {
    if (isSavingNotif.current) return;
    isSavingNotif.current = true;
    setNotifPrefs((prev) => ({ ...prev, ...updates }));
    setSavingNotif((prev) => ({ ...prev, [groupKey]: true }));

    if (!user) return;
    try {
      const res = await notificationsApi.updatePreferences(user.id, updates);
      if (res.data) {
        toast.success(t("prefsSaved"));
      } else {
        // Revert
        const revert: Record<string, boolean> = {};
        for (const k of Object.keys(updates)) revert[k] = !updates[k];
        setNotifPrefs((prev) => ({ ...prev, ...revert }));
        toast.error(res.error?.message || t("changesError"));
      }
    } catch {
      const revert: Record<string, boolean> = {};
      for (const k of Object.keys(updates)) revert[k] = !updates[k];
      setNotifPrefs((prev) => ({ ...prev, ...revert }));
      toast.error(t("changesError"));
    } finally {
      isSavingNotif.current = false;
      setSavingNotif((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Tabs className="space-y-6" value={tabFromUrl && ["profile", "security", "notifications"].includes(tabFromUrl) ? tabFromUrl : "profile"} onValueChange={(v) => router.replace(`/my/settings?tab=${v}`)}>
      <TabsList>
        <TabsTrigger className="flex items-center gap-2" value="profile">
          <User className="h-4 w-4" />
          {t("profileTab")}
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="security">
          <Shield className="h-4 w-4" />
          {t("securityTab")}
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="notifications">
          <Bell className="h-4 w-4" />
          {t("notificationsTab")}
        </TabsTrigger>
      </TabsList>

      {/* ═══════════════════════════════════════════════════════════
          PROFILE TAB
          ═══════════════════════════════════════════════════════════ */}
      <TabsContent className="space-y-6" value="profile">
        {/* ── Name & Email ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profileInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="settings-name">{t("nameLabel")}</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="flex-1"
              />
            </div>

            <Separator />

            {/* Email (read-only) with verification badge */}
            <div className="grid gap-2">
              <Label>{t("emailLabel")}</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={user?.email || ""}
                  disabled
                  type="email"
                  className="flex-1"
                />
                <Badge
                  variant={user?.emailVerified ? "default" : "outline"}
                  className={
                    user?.emailVerified
                      ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                  }
                >
                  {user?.emailVerified ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {tProfile("emailVerified")}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {tProfile("emailNotVerified")}
                    </>
                  )}
                </Badge>
              </div>
              {!user?.emailVerified && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs justify-start"
                  disabled={verifyingEmail}
                  onClick={handleSendVerification}
                >
                  {verifyingEmail ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  {tProfile("sendVerificationEmail")}
                </Button>
              )}
            </div>

            <Separator />

            {/* Language Preference */}
            <div className="grid gap-2">
              <Label>{t("languageLabel")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ua">Українська</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Delivery Address */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("deliveryAddress")}</Label>
                <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {addressLine1 || addressCity ? (
                        <>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon("edit")}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("addAddress")}
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t("deliveryAddress")}</DialogTitle>
                      <DialogDescription>
                        {t("addressDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="addr-line1">{t("streetAddress")}</Label>
                        <Input
                          id="addr-line1"
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder={t("streetAddressPlaceholder")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="addr-line2">{t("aptUnit")}</Label>
                        <Input
                          id="addr-line2"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder={t("aptUnitPlaceholder")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="addr-city">{t("city")}</Label>
                          <Input
                            id="addr-city"
                            value={addressCity}
                            onChange={(e) => setAddressCity(e.target.value)}
                            placeholder={t("cityPlaceholder")}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="addr-state">{t("state")}</Label>
                          <Input
                            id="addr-state"
                            value={addressState}
                            onChange={(e) => setAddressState(e.target.value)}
                            placeholder={t("statePlaceholder")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="addr-postal">{t("postalCode")}</Label>
                          <Input
                            id="addr-postal"
                            value={addressPostalCode}
                            onChange={(e) => setAddressPostalCode(e.target.value)}
                            placeholder={t("postalCodePlaceholder")}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="addr-country">{t("country")}</Label>
                          <Select value={addressCountry} onValueChange={setAddressCountry}>
                            <SelectTrigger id="addr-country">
                              <SelectValue placeholder={t("selectCountry")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UA">{tCountries("ua")}</SelectItem>
                              <SelectItem value="US">{tCountries("us")}</SelectItem>
                              <SelectItem value="GB">{tCountries("gb")}</SelectItem>
                              <SelectItem value="DE">{tCountries("de")}</SelectItem>
                              <SelectItem value="FR">{tCountries("fr")}</SelectItem>
                              <SelectItem value="PL">{tCountries("pl")}</SelectItem>
                              <SelectItem value="CZ">{tCountries("cz")}</SelectItem>
                              <SelectItem value="RO">{tCountries("ro")}</SelectItem>
                              <SelectItem value="MD">{tCountries("md")}</SelectItem>
                              <SelectItem value="LT">{tCountries("lt")}</SelectItem>
                              <SelectItem value="LV">{tCountries("lv")}</SelectItem>
                              <SelectItem value="EE">{tCountries("ee")}</SelectItem>
                              <SelectItem value="OTHER">{tCountries("other")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Show current address summary if editing */}
                      {addressLine1 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                          <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            <p>{addressLine1}{addressLine2 ? `, ${addressLine2}` : ""}</p>
                            <p>{addressCity}{addressState ? `, ${addressState}` : ""} {addressPostalCode}</p>
                            <p>{addressCountry}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>
                        {tCommon("cancel")}
                      </Button>
                      <Button disabled={savingAddress} onClick={handleSaveAddress}>
                        {savingAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {tCommon("save")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {/* Show address summary when saved */}
              {addressLine1 && (
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <p>{addressLine1}{addressLine2 ? `, ${addressLine2}` : ""}</p>
                    <p>{addressCity}{addressState ? `, ${addressState}` : ""} {addressPostalCode}</p>
                    <p className="text-muted-foreground">{addressCountry}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <Button
              disabled={savingProfile}
              onClick={handleSaveProfile}
              className="w-full sm:w-auto"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                tCommon("save")
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══════════════════════════════════════════════════════════
          SECURITY TAB
          ═══════════════════════════════════════════════════════════ */}
      <TabsContent className="space-y-6" value="security">
        {/* ── Change Password ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("updatePassword")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sec-current-password">
                {t("currentPassword")}
              </Label>
              <Input
                id="sec-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("currentPasswordPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sec-new-password">{t("newPassword")}</Label>
              <Input
                id="sec-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("newPasswordPlaceholder")}
              />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("passwordMinLength")}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sec-confirm-password">
                {t("confirmPassword")}
              </Label>
              <Input
                id="sec-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("confirmPasswordPlaceholder")}
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  {t("passwordMismatch")}
                </p>
              )}
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            <Button
              disabled={savingPassword}
              onClick={handleUpdatePassword}
              className="w-full sm:w-auto"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {tCommon("loading")}
                </>
              ) : (
                t("updatePassword")
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Two-Factor Authentication ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("twoFactorTitle")}</CardTitle>
            <CardDescription>{t("twoFactorDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={twoFactorEnabled ? "default" : "secondary"}
                  className={
                    twoFactorEnabled
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : ""
                  }
                >
                  {twoFactorEnabled
                    ? tProfile("twoFactorEnabled")
                    : tProfile("twoFactorDisabled")}
                </Badge>
              </div>
            </div>

            {twoFactorEnabled ? (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="grid gap-2">
                  <Label htmlFor="sec-2fa-password">
                    {tProfile("passwordLabel")}
                  </Label>
                  <Input
                    id="sec-2fa-password"
                    type="password"
                    value={twoFactorPassword}
                    onChange={(e) => setTwoFactorPassword(e.target.value)}
                    placeholder={tProfile("passwordLabel")}
                  />
                </div>
                <Button
                  variant="destructive"
                  disabled={disabling2FA}
                  onClick={handleDisable2FA}
                  size="sm"
                >
                  {disabling2FA ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {tCommon("loading")}
                    </>
                  ) : (
                    t("disableTwoFactor")
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={() => { setEnable2FADialogOpen(true); setEnableStep(1); setEnablePassword(""); setVerifyCode(""); setEnableError(null); }} size="sm">
                {t("enableTwoFactor")}
              </Button>
            )}

            {/* Enable 2FA Dialog */}
            <Dialog open={enable2FADialogOpen} onOpenChange={setEnable2FADialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {enableStep === 1 && t("enableTwoFactor")}
                    {enableStep === 2 && t("enableTwoFactor")}
                    {enableStep === 3 && tProfile("backupCodes")}
                  </DialogTitle>
                  <DialogDescription>
                    {enableStep === 1 && t("twoFactorDesc")}
                    {enableStep === 2 && tProfile("scanQrHint")}
                    {enableStep === 3 && tProfile("saveBackupCodes")}
                  </DialogDescription>
                </DialogHeader>

                {/* Step 1: Password */}
                {enableStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="enable-2fa-password">{tProfile("passwordLabel")}</Label>
                      <Input
                        id="enable-2fa-password"
                        type="password"
                        value={enablePassword}
                        onChange={(e) => { setEnablePassword(e.target.value); setEnableError(null); }}
                        placeholder={tProfile("passwordLabel")}
                      />
                    </div>
                    {enableError && (
                      <p className="text-sm text-destructive">{enableError}</p>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEnable2FADialogOpen(false)}>
                        {tCommon("cancel")}
                      </Button>
                      <Button disabled={enabling2FA || !enablePassword} onClick={handleStartEnable2FA}>
                        {enabling2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : t("enableTwoFactor")}
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {/* Step 2: Verify with TOTP code */}
                {enableStep === 2 && (
                  <div className="space-y-4">
                    {/* QR Code */}
                    {totpURI && (
                      <div className="flex justify-center">
                        <div className="rounded-md border bg-white p-2">
                          <QRCode value={totpURI} size={180} />
                        </div>
                      </div>
                    )}

                    {/* Secret key for manual entry */}
                    {totpSecret && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">{tProfile("orEnterSecret")}</p>
                        <div className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5">
                          <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <code className="text-xs font-mono tracking-wider">{totpSecret}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(totpSecret);
                              toast.success(t("copied"));
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Verify code input */}
                    <div className="grid gap-2">
                      <Label htmlFor="verify-totp">{tProfile("enterCode")}</Label>
                      <Input
                        id="verify-totp"
                        value={verifyCode}
                        onChange={(e) => { setVerifyCode(e.target.value); setEnableError(null); }}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                      />
                    </div>

                    {enableError && (
                      <p className="text-sm text-destructive">{enableError}</p>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEnable2FADialogOpen(false)}>
                        {tCommon("cancel")}
                      </Button>
                      <Button disabled={verifyingCode || verifyCode.length !== 6} onClick={handleVerify2FA}>
                        {verifyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : tProfile("verify")}
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {/* Step 3: Backup codes */}
                {enableStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-2">{tProfile("backupCodesWarning")}</p>
                      <div className="space-y-1">
                        {backupCodes.map((code, i) => (
                          <code key={i} className="block text-sm font-mono">{code}</code>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCopyBackupCodes}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t("copyBackupCodes")}
                      </Button>
                      <Button onClick={() => { setEnable2FADialogOpen(false); }}>
                        {tProfile("done")}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* ── Active Sessions ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sessionsTitle")}</CardTitle>
            <CardDescription>{t("sessionsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.name || user?.email || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "—"}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {t("currentSession")}
              </Badge>
            </div>

            <Button
              variant="outline"
              disabled={revokingSessions}
              onClick={handleRevokeSessions}
              size="sm"
            >
              {revokingSessions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {tCommon("loading")}
                </>
              ) : (
                t("revokeSessions")
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══════════════════════════════════════════════════════════
          NOTIFICATIONS TAB
          ═══════════════════════════════════════════════════════════ */}
      <TabsContent className="space-y-6" value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>{t("notificationPrefsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {notifLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* ── Order Updates group ── */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("orderUpdates")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("orderUpdatesDesc")}
                  </p>
                  <div className="space-y-3">
                    {/* Email toggle for order updates */}
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="notif-order-email"
                        className="text-sm font-normal cursor-pointer"
                      >
                        {t("emailNotifications")}
                      </Label>
                      <div className="flex items-center gap-2">
                        {savingNotif["order_email"] && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          id="notif-order-email"
                          checked={
                            ORDER_PREF_TYPES.some(
                              (t) => notifPrefs[`${t}_email`],
                            )
                          }
                          onCheckedChange={(checked) => {
                            const updates: Record<string, boolean> = {};
                            for (const type of ORDER_PREF_TYPES) {
                              updates[`${type}_email`] = checked;
                            }
                            handleToggleNotif(updates, "order_email");
                          }}
                        />
                      </div>
                    </div>

                    {/* In-app toggle for order updates */}
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="notif-order-inapp"
                        className="text-sm font-normal cursor-pointer"
                      >
                        {t("inAppNotifications")}
                      </Label>
                      <div className="flex items-center gap-2">
                        {savingNotif["order_in_app"] && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          id="notif-order-inapp"
                          checked={
                            ORDER_PREF_TYPES.some(
                              (t) => notifPrefs[`${t}_in_app`] ?? true,
                            )
                          }
                          onCheckedChange={(checked) => {
                            const updates: Record<string, boolean> = {};
                            for (const type of ORDER_PREF_TYPES) {
                              updates[`${type}_in_app`] = checked;
                            }
                            handleToggleNotif(updates, "order_in_app");
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Marketing group ── */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("marketingEmails")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("marketingDesc")}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="notif-marketing-email"
                        className="text-sm font-normal cursor-pointer"
                      >
                        {t("emailNotifications")}
                      </Label>
                      <div className="flex items-center gap-2">
                        {savingNotif["marketing_email"] && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          id="notif-marketing-email"
                          checked={
                            notifPrefs["marketing_email"] ?? false
                          }
                          onCheckedChange={(checked) =>
                            handleToggleNotif({ marketing_email: checked }, "marketing_email")
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="notif-marketing-inapp"
                        className="text-sm font-normal cursor-pointer"
                      >
                        {t("inAppNotifications")}
                      </Label>
                      <div className="flex items-center gap-2">
                        {savingNotif["marketing_in_app"] && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          id="notif-marketing-inapp"
                          checked={
                            notifPrefs["marketing_in_app"] ?? true
                          }
                          onCheckedChange={(checked) =>
                            handleToggleNotif({ marketing_in_app: checked }, "marketing_in_app")
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
