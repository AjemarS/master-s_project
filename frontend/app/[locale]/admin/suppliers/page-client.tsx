"use client";

import { useState } from "react";
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
import { Truck, Plus } from "lucide-react";
import { AdminPageHeader } from "../components";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from "../components";
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
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={Truck}
          backLabel={tc("back")}
          actions={isAdmin ? (
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("addSupplier")}
            </Button>
          ) : undefined}
        />

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
              <div className="border rounded-lg dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("contactPerson")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{tc("active")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <EmptyState icon={Truck} message={t("noSuppliers")} colSpan={5} />
                    ) : (
                      suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.contact_person}</TableCell>
                          <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                          <TableCell className="text-primary dark:text-primary">{s.email}</TableCell>
                          <TableCell>
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? tc("yes") : tc("no")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
