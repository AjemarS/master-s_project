"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Bell, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const PREFERENCES = [
  { key: "order_confirmed", label: "Підтвердження замовлення", desc: "Отримувати email після успішної оплати" },
  { key: "order_shipped", label: "Відправлення замовлення", desc: "Отримувати email при відправленні" },
  { key: "order_delivered", label: "Доставка замовлення", desc: "Отримувати email при доставці" },
  { key: "order_cancelled", label: "Скасування замовлення", desc: "Отримувати email при скасуванні" },
  { key: "marketing", label: "Маркетингові сповіщення", desc: "Отримувати новини та акції" },
];

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { user, isPending } = useCurrentUser();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("notif_prefs") : null;
    if (saved) return JSON.parse(saved);
    return Object.fromEntries(PREFERENCES.map((p) => [p.key, true]));
  });
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem("notif_prefs", JSON.stringify(prefs));
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
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
                <CardDescription>Choose which emails you receive.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {PREFERENCES.map((p) => (
              <div key={p.key} className="flex items-start gap-3 py-2 border-b last:border-0">
                <input
                  type="checkbox"
                  id={`pref-${p.key}`}
                  checked={prefs[p.key] ?? true}
                  onChange={() => toggle(p.key)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <label htmlFor={`pref-${p.key}`} className="font-medium text-sm cursor-pointer">
                    {p.label}
                  </label>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </div>
              </div>
            ))}
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
