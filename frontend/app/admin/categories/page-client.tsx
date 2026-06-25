"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, FolderTree, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { categoryApi } from "~/lib/api/admin-api";
import type { Category } from "~/lib/types";
import { ConfirmDialog, TableSkeleton } from "../components";

export function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogCategory, setDialogCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll();
      if (res.error) throw new Error(res.error.message);
      setCategories(res.data?.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити категорії");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { queueMicrotask(() => fetchCategories()); }, []);

  const openCreate = () => {
    setDialogMode("create"); setDialogCategory(null);
    setFormName(""); setShowDialog(true);
  };

  const openEdit = (cat: Category) => {
    setDialogMode("edit"); setDialogCategory(cat);
    setFormName(cat.name); setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = dialogMode === "create"
        ? await categoryApi.create({ name: formName.trim() })
        : await categoryApi.update(dialogCategory!.id!, { name: formName.trim() });
      if (res.error) {
        toast.error("Помилка", { description: res.error.message });
      } else {
        toast.success(dialogMode === "create" ? "Категорію створено" : "Категорію оновлено");
        setShowDialog(false);
        fetchCategories();
      }
    } catch (err) {
      toast.error("Помилка", { description: err instanceof Error ? err.message : "Щось пішло не так" });
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
        toast.error("Помилка видалення", { description: res.error.message });
      } else {
        toast.success("Категорію видалено");
        setDeleteDialog({ open: false, id: null, name: "" });
        fetchCategories();
      }
    } catch (err) {
      toast.error("Помилка", { description: err instanceof Error ? err.message : "Щось пішло не так" });
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
              <ArrowLeft className="h-4 w-4" /> На головну
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <FolderTree className="h-10 w-10 text-purple-600" />
                Керування категоріями
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Категорії товарів каталогу</p>
            </div>
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Додати категорію
            </Button>
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
            <CardTitle className="dark:text-slate-100">Категорії</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {categories.length > 0 ? `${categories.length} категорій` : "Немає категорій"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">ID</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Назва</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Товарів</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <FolderTree className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          Немає категорій
                        </td>
                      </tr>
                    ) : (
                      categories.map((cat) => (
                        <tr key={cat.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{cat.id}</td>
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-200">{cat.name}</td>
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
            <DialogTitle>{dialogMode === "create" ? "Додати категорію" : "Редагувати категорію"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "Створіть нову категорію товарів." : "Змініть назву категорії."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cat-name">Назва</Label>
            <Input id="cat-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Назва категорії" className="mt-2" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Скасувати</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Збереження..." : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={handleDeleteConfirm}
        title="Видалити категорію"
        description={`Ви впевнені, що хочете видалити "${deleteDialog.name}"?`}
        confirmText="Видалити"
        cancelText="Скасувати"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
