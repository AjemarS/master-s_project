"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { ErrorAlert } from "~/ui/components/error-alert";
import {
  Users,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { UserDialog } from "./user-dialog";
import { UserTable } from "./user-table";
import type { UserWithRole } from "better-auth/plugins/admin";
import { useUsers, useBanUser, useUnbanUser, useDeleteUser } from "~/lib/hooks/use-api-data";

export default function UsersPageClient() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
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

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tc("back")}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Users className="h-10 w-10 text-blue-600" />
                {t("title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
            </div>
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
          </div>
        </div>

        <ErrorAlert message={error} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t("active")}</div>
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u) => !u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t("banned")}</div>
              <div className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">Admins</div>
              <div className="text-2xl font-bold text-purple-600">
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
