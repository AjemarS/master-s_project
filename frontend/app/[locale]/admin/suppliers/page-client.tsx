"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Truck, Plus } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { AdminPageHeader, ConfirmDialog, TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useCurrentUser } from "~/lib/auth-client";
import { useSuppliers } from "~/lib/hooks/use-api-data";
import { supplierService } from "./actions";
import { SupplierDialog } from "./supplier-dialog";
import { SupplierTable } from "./supplier-table";
import type { Supplier } from "~/lib/types";
import { useActivityFeed } from "../components/activity-feed";

export function SuppliersClient() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const { data, error, isLoading, mutate } = useSuppliers();
  const suppliers = data?.results || [];

  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogSupplier, setDialogSupplier] = useState<Supplier | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const { pushEvent } = useActivityFeed();

  const openCreate = () => {
    setDialogMode("create");
    setDialogSupplier(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setDialogMode("edit");
    setDialogSupplier(supplier);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await supplierService.remove(deleteConfirmId);
      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(t("supplierDeleted"));
        pushEvent({ type: "delete", message: `Deleted supplier #${deleteConfirmId}`, entityType: "supplier" });
        setDeleteConfirmId(null);
        mutate();
      }
    } catch (err) {
      toast.error(t("deleteError"), {
        description: err instanceof Error ? err.message : tc("error"),
      });
    } finally {
      setDeleting(false);
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
          actions={
            isAdmin ? (
              <Button onClick={openCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> {t("addSupplier")}
              </Button>
            ) : undefined
          }
        />

        <ErrorAlert message={error?.message ?? null} />

        {isLoading ? (
          <TableSkeleton rows={4} cols={colSpan} />
        ) : (
          <SupplierTable
            suppliers={suppliers}
            isAdmin={isAdmin}
            colSpan={colSpan}
            onEdit={openEdit}
            onDelete={setDeleteConfirmId}
          />
        )}

        <SupplierDialog
          key={dialogKey}
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) setDialogOpen(false); }}
          mode={dialogMode}
          supplier={dialogSupplier}
          onSuccess={() => mutate()}
        />

        <ConfirmDialog
          open={deleteConfirmId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
          onConfirm={handleDelete}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmDesc")}
          confirmText={tc("delete")}
          cancelText={tc("cancel")}
          variant="destructive"
          loading={deleting}
        />
      </div>
    </div>
  );
}
