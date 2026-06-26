"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Button } from "~/ui/primitives/button";
import type { UserWithRole } from "better-auth/plugins/admin";

interface BanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onConfirm: (userId: string, reason?: string) => Promise<void>;
}

export function BanDialog({ open, onOpenChange, user, onConfirm }: BanDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Enter a reason for banning this user. This will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Reason for ban (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={async () => {
              if (user && reason.trim()) {
                await onConfirm(user.id, reason);
                setReason("");
              }
            }}
          >
            Ban User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
