"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Truck, ArrowLeft, Plus } from "lucide-react";
import { TableSkeleton } from "../components";
import { useCurrentUser } from "~/lib/auth-client";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useSuppliers, useCreateSupplier } from "~/lib/hooks/use-api-data";

export function SuppliersClient() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const { data, error, isLoading, mutate } = useSuppliers();
  const suppliers = data?.results || [];
  const { trigger: createSupplier, isMutating: saving } = useCreateSupplier();
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      await createSupplier({
        name: formName.trim(),
        contact_person: formContact.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
      });
      toast.success(t("createDialogTitle"));
      setShowCreate(false);
      setFormName(""); setFormContact(""); setFormPhone(""); setFormEmail(""); setFormAddress("");
      mutate();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tc("back")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Truck className="h-10 w-10 text-purple-600" />
                {t("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> {t("addSupplier")}
              </Button>
            )}
          </div>
        </div>

        <ErrorAlert message={error?.message ?? null} />

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">{t("title")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {suppliers.length > 0 ? tc("count", { count: suppliers.length }) : t("noSuppliers")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("name")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("contactPerson")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("phone")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("email")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("active")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {t("noSuppliers")}
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.contact_person}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.phone}</td>
                          <td className="p-4 text-blue-600 dark:text-blue-400">{s.email}</td>
                          <td className="p-4">
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? tc("yes") : tc("no")}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("name")} *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("contactPerson")}</Label>
              <Input value={formContact} onChange={(e) => setFormContact(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("phone")}</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("email")}</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t("address")}</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? tc("create") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
