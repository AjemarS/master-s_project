"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Separator } from "~/ui/primitives/separator";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, FolderTree, Languages, Globe, GitBranch } from "lucide-react";
import { categoryService } from "./actions";
import type { Category } from "~/lib/types";
import { useActivityFeed } from "../components/activity-feed";
import { motion } from "framer-motion";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  category: Category | null;
  categories: Category[];
  onSuccess: () => void;
}

export function CategoryDialog({ open, onOpenChange, mode, category, categories, onSuccess }: CategoryDialogProps) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const [formName, setFormName] = useState(mode === "edit" && category ? category.name : "");
  const [formNameUk, setFormNameUk] = useState(mode === "edit" && category ? category.name_uk || "" : "");
  const [formNameEn, setFormNameEn] = useState(mode === "edit" && category ? category.name_en || "" : "");
  const [formParent, setFormParent] = useState(
    mode === "edit" && category ? String(category.parent ?? "") : ""
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { pushEvent } = useActivityFeed();

  const resetAndClose = useCallback(() => {
    setFormError(null);
    setSaving(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (!formName.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    setFormError(null);
    setSaving(true);

    try {
      const payload: Partial<Category> = {
        name: formName.trim(),
        name_uk: formNameUk.trim() || undefined,
        name_en: formNameEn.trim() || undefined,
      };
      if (formParent) payload.parent = parseInt(formParent, 10);

      const res =
        mode === "create"
          ? await categoryService.create(payload)
          : await categoryService.update(category!.id!, payload);

      if (res.error) {
        toast.error(tc("error"), { description: res.error.message });
      } else {
        toast.success(mode === "create" ? tc("create") : tc("save"));
        pushEvent({ type: mode === "create" ? "create" : "update", message: `${mode === "create" ? "Created" : "Updated"} category "${formName.trim()}"`, entityType: "category" });
        resetAndClose();
        onSuccess();
      }
    } catch (err) {
      toast.error(tc("error"), {
        description: err instanceof Error ? err.message : tc("error"),
      });
    } finally {
      setSaving(false);
    }
  }, [formName, formNameUk, formNameEn, formParent, mode, category, onSuccess, resetAndClose, pushEvent, t, tc]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {mode === "create" ? t("addCategory") : t("editCategory")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("subtitle") : t("editCategory")}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-4 space-y-4"
        >
          <div>
            <Label htmlFor="cat-name">{t("name")} *</Label>
            <Input
              id="cat-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("name")}
              className="mt-2"
              autoFocus
            />
          </div>
          <Separator className="my-2" />
          <div>
            <Label htmlFor="cat-name-uk" className="text-xs text-muted-foreground flex items-center gap-1">
              <Languages className="h-3.5 w-3.5" />
              {t("nameUa")}
            </Label>
            <Input
              id="cat-name-uk"
              value={formNameUk}
              onChange={(e) => setFormNameUk(e.target.value)}
              placeholder={t("nameUa")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-name-en" className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {t("nameEn")}
            </Label>
            <Input
              id="cat-name-en"
              value={formNameEn}
              onChange={(e) => setFormNameEn(e.target.value)}
              placeholder={t("nameEn")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-parent" className="flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              {t("parent")}
            </Label>
            <Select value={formParent} onValueChange={setFormParent}>
              <SelectTrigger id="cat-parent" className="mt-2">
                <SelectValue placeholder={t("noParent")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("noParent")}</SelectItem>
                {categories.filter((c) => c.id !== category?.id).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {formError && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving} type="button">
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formName.trim()}
            type="button"
          >
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
