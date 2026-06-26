"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { FolderTree, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { categoryApi } from "~/lib/api/admin-api";
import type { Category } from "~/lib/types";
import { ConfirmDialog, TableSkeleton } from "../components";
import { ErrorAlert } from "~/ui/components/error-alert";
import { useCategories } from "~/lib/hooks/use-api-data";

export function CategoriesClient() {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const { data, error, isLoading, mutate } = useCategories();
  const categories = data?.results || [];
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogCategory, setDialogCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameUk, setFormNameUk] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formParent, setFormParent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setDialogMode("create"); setDialogCategory(null);
    setFormName(""); setFormNameUk(""); setFormNameEn(""); setFormParent(""); setShowDialog(true);
  };

  const openEdit = (cat: Category) => {
    setDialogMode("edit"); setDialogCategory(cat);
    setFormName(cat.name); setFormNameUk(cat.name_uk || ""); setFormNameEn(cat.name_en || "");
    setFormParent(String(cat.parent ?? "")); setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Category> = {
        name: formName.trim(),
        name_uk: formNameUk.trim() || undefined,
        name_en: formNameEn.trim() || undefined,
      };
      if (formParent) payload.parent = parseInt(formParent, 10);
      const res = dialogMode === "create"
        ? await categoryApi.create(payload)
        : await categoryApi.update(dialogCategory!.id!, payload);
      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(dialogMode === "create" ? tc("create") : tc("save"));
        setShowDialog(false);
        mutate();
      }
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setDeleting(true);
    try {
      const res = await categoryApi.delete(deleteDialog.id);
      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(tc("delete"));
        setDeleteDialog({ open: false, id: null, name: "" });
        mutate();
      }
    } catch (err) {
      toast.error(tc("error"), { description: err instanceof Error ? err.message : tc("error") });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> {tc("back")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <FolderTree className="h-10 w-10 text-purple-600" />
                {t("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
            </div>
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("addCategory")}
            </Button>
          </div>
        </div>

        <ErrorAlert message={error?.message ?? null} />

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">{t("title")}</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {categories.length > 0 ? tc("count", { count: categories.length }) : t("noCategories")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("id")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("name")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("parent")}</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t("products")}</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tc("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <FolderTree className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {t("noCategories")}
                        </td>
                      </tr>
                    ) : (
                      categories.filter((c) => !c.parent).map((cat) => (
                        <Fragment key={cat.id}>
                          <tr className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{cat.id}</td>
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-200">
                              <span className="flex items-center gap-1"><FolderTree className="h-3.5 w-3.5 text-purple-500" /> {cat.name}</span>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">—</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{cat.product_count ?? "—"}</td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: cat.id!, name: cat.name })}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {cat.children?.map((child) => (
                            <tr key={child.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{child.id}</td>
                              <td className="p-4 font-medium text-slate-900 dark:text-slate-200 pl-8">└ {child.name}</td>
                              <td className="p-4 text-slate-600 dark:text-slate-400">{cat.name}</td>
                              <td className="p-4 text-slate-600 dark:text-slate-400">{child.product_count ?? "—"}</td>
                              <td className="p-4">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEdit(child)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: child.id!, name: child.name })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t("addCategory") : t("editCategory")}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? t("subtitle") : t("editCategory")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="cat-name">{t("name")} *</Label>
              <Input id="cat-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("name")} className="mt-2" autoFocus />
            </div>
            <div>
              <Label className="text-xs text-slate-500">{t("nameUa")}</Label>
              <Input value={formNameUk} onChange={(e) => setFormNameUk(e.target.value)} placeholder={t("nameUa")} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">{t("nameEn")}</Label>
              <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder={t("nameEn")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cat-parent">{t("parent")}</Label>
              <select id="cat-parent" value={formParent} onChange={(e) => setFormParent(e.target.value)}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">{t("noParent")}</option>
                {categories.filter((c) => c.id !== dialogCategory?.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? tc("save") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  );
}
