"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { ClipboardList, Plus } from "lucide-react";
import { AdminPageHeader, ConfirmDialog } from "../components";
import {
  useGoodsReceipts, useSuppliers, useWarehouses,
} from "~/lib/hooks/use-api-data";
import { goodsReceiptService } from "./actions";
import { useCurrentUser } from "~/lib/auth-client";
import type { GoodsReceiptNote } from "~/lib/types";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useActivityFeed } from "../components/activity-feed";
import { GoodsReceiptDialog } from "./goods-receipt-dialog";
import { GoodsReceiptTable } from "./goods-receipt-table";

export function GoodsReceiptsClient() {
  const t = useTranslations("goodsReceipts");
  const tc = useTranslations("common");

  const { data: grData, error: grError, isLoading: grLoading, mutate: grMutate } = useGoodsReceipts();
  const { data: supData } = useSuppliers();
  const { data: whData } = useWarehouses();

  const receipts = grData?.results || [];
  const suppliers = supData?.results || [];
  const warehouses = whData?.results || [];

  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const { pushEvent } = useActivityFeed();

  const [deleting, setDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingReceipt, setEditingReceipt] = useState<GoodsReceiptNote | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const colSpan = isAdmin ? 7 : 6;

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await goodsReceiptService.remove(deleteConfirmId);
      if (res.error) throw new Error(res.error.message);
      toast.success(t("grnDeleted"));
      pushEvent({ type: "delete", message: `Deleted goods receipt #${deleteConfirmId}`, entityType: "goods_receipt" });
      setDeleteConfirmId(null);
      grMutate();
    } catch (err) {
      toast.error(t("deleteError"), {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setDialogMode("create");
    setEditingReceipt(null);
    setShowDialog(true);
    setDialogKey((k) => k + 1);
  };

  const openEdit = (grn: GoodsReceiptNote) => {
    setDialogMode("edit");
    setEditingReceipt(grn);
    setShowDialog(true);
    setDialogKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={ClipboardList}
          backLabel={tc("back")}
          actions={isAdmin ? (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("createGrn")}
            </Button>
          ) : undefined}
        />

        <ErrorAlert message={grError?.message || null} />

        <GoodsReceiptTable
          receipts={receipts}
          isLoading={grLoading}
          isAdmin={isAdmin}
          colSpan={colSpan}
          onEdit={openEdit}
          onDelete={setDeleteConfirmId}
        />

        <GoodsReceiptDialog
          key={dialogKey}
          open={showDialog}
          onOpenChange={setShowDialog}
          mode={dialogMode}
          receipt={editingReceipt}
          suppliers={suppliers}
          warehouses={warehouses}
          onSuccess={grMutate}
        />

        {isAdmin && (
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
        )}
      </div>
    </div>
  );
}
