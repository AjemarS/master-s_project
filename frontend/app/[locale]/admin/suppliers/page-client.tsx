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
import { Truck, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AdminPageHeader, ConfirmDialog } from "../components";
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
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "~/lib/hooks/use-api-data";
import type { Supplier } from "~/lib/types";

export function SuppliersClient() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const { data, error, isLoading, mutate } = useSuppliers();
  const suppliers = data?.results || [];
  const { trigger: createSupplier, isMutating: saving } = useCreateSupplier();
  const { trigger: updateSupplier, isMutating: updating } = useUpdateSupplier();
  const { trigger: deleteSupplier, isMutating: deleting } = useDeleteSupplier();

  const [formError, setFormError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const handleCreate = async () => {
    if (!formName.trim()) return;
    if (formEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setFormError("Invalid email format.");
      return;
    }
    setFormError(null);
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

  const openEdit = (supplier: Supplier) => {
    setFormError(null);
    setEditingSupplier(supplier);
    setEditName(supplier.name);
    setEditContact(supplier.contact_person || "");
    setEditPhone(supplier.phone || "");
    setEditEmail(supplier.email || "");
    setEditAddress(supplier.address || "");
  };

  const handleEdit = async () => {
    if (!editingSupplier || !editName.trim()) return;
    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setFormError("Invalid email format.");
      return;
    }
    setFormError(null);
    try {
      await updateSupplier({
        id: editingSupplier.id,
        data: {
          name: editName.trim(),
          contact_person: editContact.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
        },
      });
      toast.success(t("supplierUpdated"));
      setEditingSupplier(null);
      mutate();
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteSupplier(deleteConfirmId);
      toast.success(t("supplierDeleted"));
      setDeleteConfirmId(null);
      mutate();
    } catch (err) {
      toast.error(t("deleteError"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  const colSpan = isAdmin ? 6 : 5;

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={Truck}
          backLabel={tc("back")}
          actions={isAdmin ? (
            <Button onClick={() => { setFormError(null); setShowCreate(true); }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("addSupplier")}
            </Button>
          ) : undefined}
        />

        <ErrorAlert message={error?.message ?? null} />

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">{t("title")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {suppliers.length > 0 ? tc("count", { count: suppliers.length }) : t("noSuppliers")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={4} cols={colSpan} />
            ) : (
              <div className="border rounded-lg dark:border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b dark:border-border">
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("contactPerson")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{tc("active")}</TableHead>
                      {isAdmin && <TableHead className="text-right">{tc("actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <EmptyState icon={Truck} message={t("noSuppliers")} colSpan={colSpan} />
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
                          {isAdmin && (
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmId(s.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
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

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setFormError(null); setShowCreate(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-name" className="text-right pr-2">{t("name")} *</Label>
              <Input id="sup-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-contact" className="text-left pr-2">{t("contactPerson")}</Label>
              <Input id="sup-contact" value={formContact} onChange={(e) => setFormContact(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-phone" className="text-right pr-2">{t("phone")}</Label>
              <Input id="sup-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-email" className="text-right pr-2">{t("email")}</Label>
              <Input id="sup-email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-address" className="text-right pr-2">{t("address")}</Label>
              <Input id="sup-address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="col-span-3" />
            </div>
          </div>
          {formError && (
            <Alert variant="destructive" className="mb-2 mx-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? tc("saving") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSupplier} onOpenChange={(o) => { if (!o) { setFormError(null); setEditingSupplier(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-edit-name" className="text-right pr-2">{t("name")} *</Label>
              <Input id="sup-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-edit-contact" className="text-left pr-2">{t("contactPerson")}</Label>
              <Input id="sup-edit-contact" value={editContact} onChange={(e) => setEditContact(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-edit-phone" className="text-right pr-2">{t("phone")}</Label>
              <Input id="sup-edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-edit-email" className="text-right pr-2">{t("email")}</Label>
              <Input id="sup-edit-email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sup-edit-address" className="text-right pr-2">{t("address")}</Label>
              <Input id="sup-edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="col-span-3" />
            </div>
          </div>
          {formError && (
            <Alert variant="destructive" className="mb-2 mx-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSupplier(null)} disabled={updating}>{tc("cancel")}</Button>
            <Button onClick={handleEdit} disabled={updating || !editName.trim()}>
              {updating ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        onConfirm={handleDelete}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmText={tc("delete")}
        cancelText={tc("cancel")}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
