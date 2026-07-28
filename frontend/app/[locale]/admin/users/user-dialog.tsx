"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Mail, User, Lock, Shield, Eye, EyeOff } from "lucide-react";
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
  const t = useTranslations("users");
  const tc = useTranslations("common");
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

  const resetAndClose = useCallback(() => {
    setFormError(null);
    setSaving(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) resetAndClose();
  }, [resetAndClose]);

  const handleSave = useCallback(async () => {
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

    if (mode === "edit" && !user) return;

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
  }, [mode, name, email, password, role, user, pushEvent, resetAndClose, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addUser") : t("editUser")}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new user account."
              : "Update user details."}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ud-email" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {t("email")} *
              </Label>
              <Input
                id="ud-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ud-name" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {t("name")} *
              </Label>
              <Input
                id="ud-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>

            {mode === "create" && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="ud-password" className="flex items-center gap-1.5 pt-1.5 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Password *
                </Label>
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
              <Label htmlFor="ud-role" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                {t("role")}
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user" | "cashier" | "warehouse_worker")}>
                <SelectTrigger id="ud-role" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("user")}</SelectItem>
                  <SelectItem value="cashier">{t("cashier")}</SelectItem>
                  <SelectItem value="warehouse_worker">{t("warehouseWorker")}</SelectItem>
                  <SelectItem value="admin">{t("admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError && (
            <Alert variant="destructive" className="mt-4 mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
        </motion.div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving} type="button">
            {tc("cancel")}
          </Button>
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
            {saving ? tc("saving") : mode === "create" ? t("addUser") : t("editUser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
