"use client";

import { useState, Fragment } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react";
import { categoryApi } from "~/lib/api/admin-api";
import type { Category } from "~/lib/types";
import { ConfirmDialog, TableSkeleton, EmptyState, AdminPageHeader } from "../components";
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

        <Card className="dark:bg-card dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("title")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {categories.length > 0 ? tc("count", { count: categories.length }) : t("noCategories")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : (
              <div className="border rounded-lg dark:border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b dark:border-border">
                      <TableHead>{t("id")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("parent")}</TableHead>
                      <TableHead>{t("products")}</TableHead>
                      <TableHead className="text-right">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <EmptyState icon={FolderTree} message={t("noCategories")} colSpan={5} />
                    ) : (
                      categories.filter((c) => !c.parent).map((cat) => (
                        <Fragment key={cat.id}>
                          <TableRow>
                            <TableCell className="font-medium">#{cat.id}</TableCell>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-1"><FolderTree className="h-3.5 w-3.5 text-primary" /> {cat.name}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">{cat.product_count ?? "—"}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: cat.id!, name: cat.name })}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {cat.children?.map((child) => (
                            <TableRow key={child.id}>
                              <TableCell className="font-medium">#{child.id}</TableCell>
                              <TableCell className="font-medium pl-8">└ {child.name}</TableCell>
                              <TableCell className="text-muted-foreground">{cat.name}</TableCell>
                              <TableCell className="text-muted-foreground">{child.product_count ?? "—"}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEdit(child)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: child.id!, name: child.name })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
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
              <Label htmlFor="cat-name-uk" className="text-xs text-muted-foreground">{t("nameUa")}</Label>
              <Input id="cat-name-uk" value={formNameUk} onChange={(e) => setFormNameUk(e.target.value)} placeholder={t("nameUa")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cat-name-en" className="text-xs text-muted-foreground">{t("nameEn")}</Label>
              <Input id="cat-name-en" value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder={t("nameEn")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cat-parent">{t("parent")}</Label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger id="cat-parent" className="mt-2"><SelectValue placeholder={t("noParent")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("noParent")}</SelectItem>
                  {categories.filter((c) => c.id !== dialogCategory?.id).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? tc("saving") : tc("save")}
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
