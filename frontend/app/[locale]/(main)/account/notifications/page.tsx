"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Bell, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { notificationsApi, type NotificationPreferences } from "~/lib/api/notifications";

const PREF_GROUPS = [
  {
    type: "order_confirmed",
    label: "Підтвердження замовлення",
    desc: "Отримувати сповіщення після успішної оплати",
  },
  {
    type: "order_shipped",
    label: "Відправлення замовлення",
    desc: "Отримувати сповіщення при відправленні",
  },
  {
    type: "order_delivered",
    label: "Доставка замовлення",
    desc: "Отримувати сповіщення при доставці",
  },
  {
    type: "order_cancelled",
    label: "Скасування замовлення",
    desc: "Отримувати сповіщення при скасуванні",
  },
  {
    type: "marketing",
    label: "Маркетингові сповіщення",
    desc: "Отримувати новини та акції",
  },
  {
    type: "low_stock",
    label: "Низький залишок",
    desc: "Сповіщення про низькі залишки (адміністратори)",
  },
];

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { user, isPending } = useCurrentUser();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await notificationsApi.getPreferences(user.id);
      if (res.data) {
        const p: Record<string, boolean> = {};
        const d = res.data;
        const fields = [
          "order_confirmed_email", "order_confirmed_in_app",
          "order_shipped_email", "order_shipped_in_app",
          "order_delivered_email", "order_delivered_in_app",
          "order_cancelled_email", "order_cancelled_in_app",
          "marketing_email", "marketing_in_app",
          "low_stock_email", "low_stock_in_app",
        ] as const satisfies readonly (keyof NotificationPreferences)[];
        for (const f of fields) {
          p[f] = d[f] === true;
        }
        setPrefs(p);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(async (uid: string, p: Record<string, boolean>) => {
    setSaving(true);
    try {
      const res = await notificationsApi.updatePreferences(uid, p);
      if (res.data) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(res.error?.message || "Failed to save preferences");
      }
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }, []);

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/account">
          <Button variant="ghost" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Account
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose which notifications you receive and how.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-sm text-slate-500">Loading preferences...</p>
            ) : (
              PREF_GROUPS.map((g) => (
                <div key={g.type} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="mb-2">
                    <p className="font-medium text-sm">{g.label}</p>
                    <p className="text-xs text-slate-500">{g.desc}</p>
                  </div>
                  <div className="flex gap-6 pl-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs[`${g.type}_email`] ?? true}
                        onChange={() => toggle(`${g.type}_email`)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs[`${g.type}_in_app`] ?? true}
                        onChange={() => toggle(`${g.type}_in_app`)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      In-App
                    </label>
                  </div>
                </div>
              ))
            )}
            <Button onClick={() => save(user.id, prefs)} disabled={saving || loading} className="w-full">
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
