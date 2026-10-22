"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === "destructive" && <AlertTriangle className="h-5 w-5 text-destructive" />}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText ?? t("cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("loading") : (confirmText ?? t("confirm"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * `await confirm(question)` in place of window.confirm: resolves true on confirm, false on cancel/close.
 * Render the returned element once in the component.
 */
export function useConfirm() {
  const [pending, setPending] = useState<{ question: string; resolve: (ok: boolean) => void } | null>(null);
  const confirm = useCallback(
    (question: string) => new Promise<boolean>((resolve) => setPending({ question, resolve })),
    [],
  );
  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => { if (!open) settle(false); }}
      onConfirm={() => settle(true)}
      title={pending?.question ?? ""}
      description=""
      variant="destructive"
    />
  );
  return [confirm, dialog] as const;
}
