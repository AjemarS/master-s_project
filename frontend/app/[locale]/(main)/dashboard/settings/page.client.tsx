"use client";

import { Bell, Lock, User } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "~/i18n/navigation";

import { authClient, useCurrentUser } from "~/lib/auth-client";
import { notificationsApi } from "~/lib/api/notifications";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Switch } from "~/ui/primitives/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";
import { toast } from "sonner";

export function SettingsPageClient() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useCurrentUser();

  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const twoFactorEnabled = user?.twoFactorEnabled || false;

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

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const payload: Record<string, boolean> = {};
      for (const type of ["order_confirmed", "order_shipped", "order_delivered", "order_cancelled"]) {
        payload[`${type}_email`] = emailNotifs;
        payload[`${type}_in_app`] = orderUpdates;
      }
      payload.marketing_email = marketingEmails;
      payload.marketing_in_app = marketingEmails;
      payload.low_stock_email = false;
      payload.low_stock_in_app = false;
      const res = await notificationsApi.updatePreferences(user.id, payload);
      if (res.data) {
        toast.success(t("prefsSaved"));
      } else {
        toast.error(res.error?.message || t("changesError"));
      }
    } catch {
      toast.error(t("changesError"));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordError"), { description: "Passwords do not match" });
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

  const handleToggle2FA = async () => {
    router.push("/dashboard/profile");
  };

  return (
    <div className="container space-y-6 p-4 md:p-8">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <Tabs className="space-y-4" defaultValue="profile">
        <TabsList>
          <TabsTrigger className="flex items-center gap-2" value="profile">
            <User className="h-4 w-4" />
            {t("profileTab")}
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="notifications">
            <Bell className="h-4 w-4" />
            {t("notificationsTab")}
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="security">
            <Lock className="h-4 w-4" />
            {t("securityTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-name">{t("nameLabel")}</Label>
                <Input
                  defaultValue={user?.name || ""}
                  id="settings-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-email">{t("emailLabel")}</Label>
                <Input
                  defaultValue={user?.email || ""}
                  disabled
                  id="settings-email"
                  placeholder={t("emailPlaceholder")}
                  type="email"
                />
              </div>
              <Button disabled={savingProfile} onClick={handleSaveProfile}>
                {savingProfile ? tCommon("loading") : t("saveChanges")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("notificationPrefsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-notifications">{t("emailNotifications")}</Label>
                <Switch
                  checked={emailNotifs}
                  id="email-notifications"
                  onCheckedChange={setEmailNotifs}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="marketing-emails">{t("marketingEmails")}</Label>
                <Switch
                  checked={marketingEmails}
                  id="marketing-emails"
                  onCheckedChange={setMarketingEmails}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="order-updates">{t("orderUpdates")}</Label>
                <Switch
                  checked={orderUpdates}
                  defaultChecked
                  id="order-updates"
                  onCheckedChange={setOrderUpdates}
                />
              </div>
              <Button disabled={savingPrefs} onClick={handleSavePrefs}>
                {savingPrefs ? tCommon("loading") : t("savePrefs")}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                <Link href="/account/notifications" className="underline hover:text-primary">
                  {t("managePrefsLink")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t("updatePassword")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">{t("currentPassword")}</Label>
                <Input
                  id="current-password"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("currentPasswordPlaceholder")}
                  type="password"
                  value={currentPassword}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <Input
                  id="new-password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("newPasswordPlaceholder")}
                  type="password"
                  value={newPassword}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("confirmPasswordPlaceholder")}
                  type="password"
                  value={confirmPassword}
                />
              </div>
              <Button disabled={savingPassword} onClick={handleUpdatePassword}>
                {savingPassword ? tCommon("loading") : t("updatePassword")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("twoFactorTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label>{t("twoFactorTitle")}</Label>
                  <p className="text-sm text-muted-foreground">{t("twoFactorDesc")}</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  id="2fa"
                  onCheckedChange={handleToggle2FA}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
