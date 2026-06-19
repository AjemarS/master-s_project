"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle } from "lucide-react";
import { adminService } from "./actions";
import type { UserWithRole } from "better-auth/plugins/admin";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, mode, user, onSuccess }: UserDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetAndClose = () => {
    setFormError(null);
    setSaving(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (mode === "create") {
      if (!name.trim()) { setFormError("Name is required."); return; }
      if (!email.trim()) { setFormError("Email is required."); return; }
      if (!password) { setFormError("Password is required."); return; }
      if (!email.includes("@")) { setFormError("Invalid email address."); return; }
    } else {
      if (!name.trim()) { setFormError("Name is required."); return; }
      if (!email.trim()) { setFormError("Email is required."); return; }
      if (!email.includes("@")) { setFormError("Invalid email address."); return; }
    }

    setFormError(null);
    setSaving(true);

    try {
      let response;

      if (mode === "create") {
        response = await adminService.createUser({
          email: email.trim(),
          password,
          name: name.trim(),
          role,
        });
      } else if (user) {
        response = await adminService.updateUser(user.id, {
          name: name.trim(),
          email: email.trim(),
          role,
        });
      }

      if (response?.error) {
        toast.error(mode === "create" ? "Failed to create user" : "Failed to update user", {
          description: response.error.message,
        });
      } else {
        toast.success(mode === "create" ? "User created" : "User updated", {
          description: `${name.trim()} has been ${mode === "create" ? "created" : "updated"}.`,
        });
        resetAndClose();
        onSuccess();
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create User" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new user account."
              : "Update user details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ud-email" className="text-right">Email *</Label>
            <Input
              id="ud-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ud-name" className="text-right">Name *</Label>
            <Input
              id="ud-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          {mode === "create" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ud-password" className="text-right">Password *</Label>
              <Input
                id="ud-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ud-role" className="text-right">Role</Label>
            <select
              id="ud-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {formError && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving} type="button">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              !email.trim() ||
              (mode === "create" && !password)
            }
            type="button"
          >
            {saving ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
