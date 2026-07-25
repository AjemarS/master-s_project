"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "~/ui/primitives/button";
import { Plus, FolderTree } from "lucide-react";
import { AdminPageHeader, ConfirmDialog } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useCategories } from "~/lib/hooks/use-api-data";
import { categoryService } from "./actions";
import { CategoryDialog } from "./category-dialog";
import { CategoryTable } from "./category-table";
import type { Category } from "~/lib/types";

export function CategoriesClient() {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const { data, error, isLoading, mutate } = useCategories();
  const categories = data?.results || [];

  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogCategory, setDialogCategory] = useState<Category | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({ open: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setDialogMode("create");
    setDialogCategory(null);
    setShowDialog(true);
    setDialogKey((k) => k + 1);
  };

  const openEdit = (cat: Category) => {
    setDialogMode("edit");
    setDialogCategory(cat);
    setShowDialog(true);
    setDialogKey((k) => k + 1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setDeleting(true);
    try {
      const res = await categoryService.remove(deleteDialog.id);
      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(tc("delete"));
        setDeleteDialog({ open: false, id: null, name: "" });
        mutate();
      }
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : tc("error"),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={FolderTree}
          backLabel={tc("back")}
          actions={
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("addCategory")}
            </Button>
          }
        />

        <ErrorAlert message={error?.message ?? null} />

        <CategoryTable
          categories={categories}
          onEdit={openEdit}
          onDelete={(cat) =>
            setDeleteDialog({ open: true, id: cat.id!, name: cat.name })
          }
          isLoading={isLoading}
        />

        <CategoryDialog
          key={dialogKey}
          open={showDialog}
          onOpenChange={setShowDialog}
          mode={dialogMode}
          category={dialogCategory}
          categories={categories}
          onSuccess={() => mutate()}
        />

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          onConfirm={handleDeleteConfirm}
          title={t("deleteCategory")}
          description={t("deleteConfirm", { name: deleteDialog.name })}
          confirmText={tc("delete")}
          cancelText={tc("cancel")}
          variant="destructive"
          loading={deleting}
        />
      </div>
    </div>
  );
}
