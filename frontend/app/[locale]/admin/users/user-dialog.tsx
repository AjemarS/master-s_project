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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { adminService } from "./actions";
import type { UserWithRole } from "better-auth/plugins/admin";
import { useActivityFeed } from "../components/activity-feed";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, mode, user, onSuccess }: UserDialogProps) {
  const { pushEvent } = useActivityFeed();
  const [email, setEmail] = useState(mode === "edit" && user ? user.email ?? "" : "");
  const [name, setName] = useState(mode === "edit" && user ? user.name ?? "" : "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "cashier" | "warehouse_worker">(
    mode === "edit" && user ? (user.role as "admin" | "user" | "cashier" | "warehouse_worker") ?? "user" : "user"
  );
  const [showPassword, setShowPassword] = useState(false);
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
      if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormError("Invalid email address."); return; }
    } else {
      if (!name.trim()) { setFormError("Name is required."); return; }
      if (!email.trim()) { setFormError("Email is required."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormError("Invalid email address."); return; }
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
        pushEvent({ type: mode === "create" ? "create" : "update", message: `${mode === "create" ? "Created" : "Updated"} user "${name.trim()}"`, entityType: "user" });
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
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="ud-password" className="text-right pt-1.5">Password *</Label>
              <div className="col-span-3 space-y-1.5">
                <div className="relative">
                  <Input
                    id="ud-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        password.length < 6
                          ? "bg-red-500 w-1/3"
                          : password.length < 10
                            ? "bg-yellow-500 w-2/3"
                            : "bg-green-500 w-full"
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ud-role" className="text-right">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user" | "cashier" | "warehouse_worker")}>
              <SelectTrigger id="ud-role" className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="warehouse_worker">Warehouse Worker</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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
