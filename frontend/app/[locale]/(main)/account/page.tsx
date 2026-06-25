"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useCurrentUser } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { User, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();
  const { user, isPending } = useCurrentUser();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  const handleUpdateName = async () => {
    setLoadingName(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result?.error) {
        toast.error(result.error.message || "Failed to update name");
      } else {
        toast.success("Name updated");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoadingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoadingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (result?.error) {
        toast.error(result.error.message || "Failed to change password");
      } else {
        toast.success("Password changed");
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <User className="h-8 w-8 text-purple-600" /> My Account
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user.email || ""} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed here.</p>
            </div>
            <div>
              <Label htmlFor="ac-name">Name</Label>
              <Input id="ac-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={handleUpdateName} disabled={loadingName || !name.trim()}>
              {loadingName ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Lock className="h-5 w-5 text-purple-600" />
            <CardTitle>Change password</CardTitle>
            <CardDescription>Set a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ac-current">Current password</Label>
              <Input id="ac-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ac-new">New password</Label>
              <Input id="ac-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
            </div>
            <Button onClick={handleChangePassword} disabled={loadingPassword || !currentPassword || !newPassword}>
              {loadingPassword ? "Changing..." : "Change password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>View your order history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/orders">My Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
