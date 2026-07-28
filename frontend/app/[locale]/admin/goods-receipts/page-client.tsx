"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { ClipboardList, Plus } from "lucide-react";
import { AdminPageHeader } from "../components";
import {
  useGoodsReceipts, useSuppliers, useWarehouses,
} from "~/lib/hooks/use-api-data";
import { useCurrentUser } from "~/lib/auth-client";
import type { GoodsReceiptNote } from "~/lib/types";
import { ErrorAlert } from "~/ui/components/error-alert";
import { GoodsReceiptDialog } from "./goods-receipt-dialog";
import { GoodsReceiptDetailDialog } from "./goods-receipt-detail-dialog";
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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDialogKey, setCreateDialogKey] = useState(0);
  const [viewingReceipt, setViewingReceipt] = useState<GoodsReceiptNote | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const colSpan = 7;

  const openCreate = () => {
    setCreateDialogKey((k) => k + 1);
    setShowCreateDialog(true);
  };

  const openView = (grn: GoodsReceiptNote) => {
    setViewingReceipt(grn);
    setShowDetailDialog(true);
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
          colSpan={colSpan}
          onView={openView}
        />

        <GoodsReceiptDialog
          key={createDialogKey}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          suppliers={suppliers}
          warehouses={warehouses}
          onSuccess={grMutate}
        />

        <GoodsReceiptDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          receipt={viewingReceipt}
        />
      </div>
    </div>
  );
}
