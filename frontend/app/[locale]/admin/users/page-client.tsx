"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { ErrorAlert } from "~/ui/components/error-alert";
import {
  Users,
  Plus,
} from "lucide-react";
import { AdminPageHeader } from "../components";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { UserDialog } from "./user-dialog";
import { UserTable } from "./user-table";
import type { UserWithRole } from "better-auth/plugins/admin";
import { useUsers, useBanUser, useUnbanUser, useDeleteUser } from "~/lib/hooks/use-api-data";
import { authClient } from "~/lib/auth-client";

export default function UsersPageClient() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const ti = useTranslations("impersonation");
  const PAGE_SIZE = 20;

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { users, total: totalCount, error, isLoading, mutate } = useUsers(
    debouncedSearchTerm, filterRole, filterStatus, currentPage, PAGE_SIZE
  );

  const { trigger: banTrigger } = useBanUser();
  const { trigger: unbanTrigger } = useUnbanUser();
  const { trigger: deleteTrigger } = useDeleteUser();

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<"create" | "edit">("create");
  const [userDialogUser, setUserDialogUser] = useState<UserWithRole | null>(null);
  const [userDialogKey, setUserDialogKey] = useState(0);

  const handleDelete = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    try {
      await deleteTrigger(userId);
      mutate();
      toast.success("User removed", {
        description: `${user?.name || user?.email || userId} has been removed.`,
      });
    } catch (err) {
      toast.error("Failed to remove user", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  const handleBan = async (userId: string, reason: string) => {
    try {
      await banTrigger(userId, reason);
      mutate();
      toast.success("User banned", {
        description: `User has been banned. Reason: ${reason}`,
      });
    } catch (err) {
      toast.error("Failed to ban user", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  const handleUnban = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    try {
      await unbanTrigger(userId);
      mutate();
      toast.success("User unbanned", {
        description: `${user?.name || user?.email || userId} has been unbanned.`,
      });
    } catch (err) {
      toast.error("Failed to unban user", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  const handleImpersonate = async (user: UserWithRole) => {
    try {
      await authClient.admin.impersonateUser({ userId: user.id });
      toast.success(ti("impersonateSuccess"), {
        description: user.name || user.email,
      });
      // Refresh page to reflect impersonation state (badge will appear)
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error(ti("impersonateFailed"), {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          icon={Users}
          backLabel={tc("back")}
          actions={
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setUserDialogMode("create");
                setUserDialogUser(null);
                setShowUserDialog(true);
                setUserDialogKey((k) => k + 1);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("addUser")}
            </Button>
          }
        />

        <ErrorAlert message={error} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Users</div>
              <div className="text-3xl font-bold text-foreground">{totalCount}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("active")}</div>
              <div className="text-3xl font-bold text-primary">
                {users.filter((u) => !u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("banned")}</div>
              <div className="text-3xl font-bold text-destructive">
                {users.filter((u) => u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-card dark:border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Admins</div>
              <div className="text-3xl font-bold text-primary">
                {users.filter((u) => u.role === "admin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <UserTable
          users={users}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          searchTerm={searchTerm}
          roleFilter={filterRole}
          statusFilter={filterStatus}
          onSearchChange={setSearchTerm}
          onRoleFilterChange={setFilterRole}
          onStatusFilterChange={setFilterStatus}
          onPageChange={(page) => { setCurrentPage(page); mutate(); }}
          onEdit={(user) => {
            setUserDialogMode("edit");
            setUserDialogUser(user);
            setShowUserDialog(true);
            setUserDialogKey((k) => k + 1);
          }}
          onDelete={handleDelete}
          onBan={handleBan}
          onUnban={handleUnban}
          onImpersonate={handleImpersonate}
          isLoading={isLoading}
        />

        <UserDialog
          key={userDialogKey}
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          mode={userDialogMode}
          user={userDialogUser}
          onSuccess={() => mutate()}
        />
      </div>
    </div>
  );
}
