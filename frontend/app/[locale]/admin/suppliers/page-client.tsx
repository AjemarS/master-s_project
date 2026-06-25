"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Truck, ArrowLeft, Plus } from "lucide-react";
import { supplierApi } from "~/lib/api/admin-api";
import type { Supplier } from "~/lib/types";
import { TableSkeleton } from "../components";
import { useCurrentUser } from "~/lib/auth-client";

export function SuppliersClient() {
  const tSup = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await supplierApi.getAll();
        if (cancelled) return;
        if (res.error) throw new Error(res.error.message);
        setSuppliers(res.data?.results || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load suppliers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await supplierApi.create({
        name: formName.trim(),
        contact_person: formContact.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
      });
      if (res.error) {
        toast.error("Failed to create supplier", { description: res.error.message });
      } else {
        toast.success("Supplier created", { description: `${formName.trim()} created.` });
        setShowCreate(false);
        setFormName(""); setFormContact(""); setFormPhone(""); setFormEmail(""); setFormAddress("");
        const refetch = await supplierApi.getAll();
        if (!refetch.error) setSuppliers(refetch.data?.results || []);
      }
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              На головну
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Truck className="h-10 w-10 text-purple-600" />
                Постачальники
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Управління постачальниками</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Додати постачальника
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">Список постачальників</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {suppliers.length > 0 ? `${suppliers.length} постачальників` : "Немає постачальників"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Назва</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Контактна особа</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Телефон</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Активний</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Немає постачальників
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
                              {s.is_active ? "Так" : "Ні"}
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
            <DialogTitle>Додати постачальника</DialogTitle>
            <DialogDescription>Додайте нового постачальника.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Назва *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Контактна особа</Label>
              <Input value={formContact} onChange={(e) => setFormContact(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Телефон</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Email</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Адреса</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Скасувати</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? "Створення..." : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
