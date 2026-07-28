"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import type { UserWithRole } from "better-auth/plugins/admin";
import { useActivityFeed } from "../components/activity-feed";

interface BanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onConfirm: (userId: string, reason?: string) => Promise<void>;
}

export function BanDialog({ open, onOpenChange, user, onConfirm }: BanDialogProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const { pushEvent } = useActivityFeed();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(user.id, reason);
      pushEvent({
        type: "ban",
        message: `Banned user "${user?.name || user?.id}"`,
        entityType: "user",
      });
    } finally {
      setSubmitting(false);
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {t("banUser")}
          </DialogTitle>
          <DialogDescription>
            Enter the reason for banning this user.
          </DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will revoke all access for this user immediately.
              </AlertDescription>
            </Alert>
            <Label htmlFor="ban-reason">{t("banReason")}</Label>
            <Input
              id="ban-reason"
              placeholder={t("banReasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
              className="mt-2"
            />
          </div>
        </motion.div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }}
          >
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={submitting || !reason.trim()}
            onClick={handleConfirm}
          >
            {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("banUser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
