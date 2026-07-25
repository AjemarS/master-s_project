"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Warehouse as WarehouseIcon, Plus, ArrowRightLeft } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { ErrorAlert } from "~/ui/components/error-alert";
import { AdminPageHeader, ConfirmDialog, TableSkeleton } from "../components";
import {
  useWarehouses,
  useStock,
  useProducts,
  useDeleteWarehouse,
} from "~/lib/hooks/use-api-data";
import { useCurrentUser } from "~/lib/auth-client";
import type { Warehouse } from "~/lib/types";
import { WarehouseTable } from "./warehouse-table";
import { WarehouseStatsCards } from "./warehouse-stats-cards";
import { WarehouseDialog } from "./warehouse-dialog";
import { WarehouseTransferDialog } from "./warehouse-transfer-dialog";
import { WarehouseStockDialog } from "./warehouse-stock-dialog";

export function WarehousesClient() {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");

  const { data: whData, error: whError, isLoading: whLoading, mutate: whMutate } = useWarehouses();
  const { data: stData, error: stError, isLoading: stLoading, mutate: stMutate } = useStock({ pageSize: 250 });
  const { data: productsData } = useProducts({ pageSize: 1000 });

  const { trigger: deleteWarehouse, isMutating: deleting } = useDeleteWarehouse();

  const warehouses: Warehouse[] = whData?.results ?? [];
  const stock = stData ?? [];
  const error = whError || stError || null;
  const loading = whLoading || stLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [stockDialogWh, setStockDialogWh] = useState<Warehouse | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [transferKey, setTransferKey] = useState(0);

  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    productsData?.results?.forEach(p => map.set(p.id, p.name));
    return map;
  }, [productsData]);

  const revalidate = () => {
    whMutate();
    stMutate();
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    revalidate();
  };

  const handleEditSuccess = () => {
    setEditWarehouse(null);
    revalidate();
  };

  const handleTransferSuccess = () => {
    setShowTransfer(false);
    revalidate();
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteWarehouse(deleteConfirmId);
      toast.success(t("warehouseDeleted"));
      setDeleteConfirmId(null);
      revalidate();
    } catch (err) {
      toast.error(t("deleteError"), { description: err instanceof Error ? err.message : tc("error") });
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={WarehouseIcon}
          backLabel={tc("back")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setShowTransfer(true); setTransferKey((k) => k + 1); }} className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" /> {t("transferStock")}
              </Button>
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> {t("createWarehouse")}
              </Button>
            </div>
          }
        />

        <ErrorAlert message={error?.message || null} />

        {loading ? (
          <div className="space-y-6">
            <TableSkeleton rows={4} cols={4} />
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <div className="space-y-6">
            <WarehouseTable
              warehouses={warehouses}
              isLoading={loading}
              isAdmin={isAdmin}
              onEdit={(wh) => { setEditWarehouse(wh); setDialogKey((k) => k + 1); }}
              onDelete={(id) => setDeleteConfirmId(id)}
            />

            <WarehouseStatsCards
              warehouses={warehouses}
              stock={stock}
              onCardClick={(wh) => setStockDialogWh(wh)}
            />
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <WarehouseDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        mode="create"
        warehouse={null}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      <WarehouseDialog
        key={dialogKey}
        open={!!editWarehouse}
        onOpenChange={(open) => { if (!open) setEditWarehouse(null); }}
        mode="edit"
        warehouse={editWarehouse}
        onSuccess={handleEditSuccess}
      />

      {/* Transfer Dialog */}
      <WarehouseTransferDialog
        key={transferKey}
        open={showTransfer}
        onOpenChange={setShowTransfer}
        warehouses={warehouses}
        onSuccess={handleTransferSuccess}
      />

      {/* Stock Detail Dialog */}
      <WarehouseStockDialog
        open={!!stockDialogWh}
        onOpenChange={(open) => { if (!open) setStockDialogWh(null); }}
        warehouse={stockDialogWh}
        stock={stock}
        productNames={productNames}
      />

      {/* Delete Confirmation */}
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
