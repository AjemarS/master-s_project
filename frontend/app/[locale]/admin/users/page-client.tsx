"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import {
  Users,
  Plus,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import type { UserWithRole } from "better-auth/plugins/admin";
import { adminService } from "./actions";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { UserDialog } from "./user-dialog";
import { UserTable } from "./user-table";

interface UsersPageClientProps {
  initialUsers: UserWithRole[];
  initialError: string | null;
}

export default function UsersPageClient({ initialUsers, initialError }: UsersPageClientProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const PAGE_SIZE = 20;

  const [users, setUsers] = useState<UserWithRole[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [loading, setLoading] = useState(initialUsers.length === 0);
  const [error, setError] = useState<string | null>(initialError);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialUsers.length);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<"create" | "edit">("create");
  const [userDialogUser, setUserDialogUser] = useState<UserWithRole | null>(null);
  const [userDialogKey, setUserDialogKey] = useState(0);

  const [filterRole, setFilterRole] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const query: Record<string, unknown> = {
        searchValue: debouncedSearchTerm,
        limit: PAGE_SIZE,
        offset,
      };

      if (filterRole) {
        query.filterField = "role";
        query.filterValue = filterRole;
        query.filterOperator = "eq";
      } else if (filterStatus === "active") {
        query.filterField = "banned";
        query.filterValue = false;
        query.filterOperator = "eq";
      } else if (filterStatus === "banned") {
        query.filterField = "banned";
        query.filterValue = true;
        query.filterOperator = "eq";
      }

      const response = await adminService.listUsers(query);
      if (response.data) {
        let resultUsers = response.data.users;
        if (filterRole && filterStatus === "active") {
          resultUsers = resultUsers.filter((u) => u.role === filterRole && !u.banned);
        } else if (filterRole && filterStatus === "banned") {
          resultUsers = resultUsers.filter((u) => u.role === filterRole && u.banned);
        }
        setUsers(resultUsers);
        setTotalCount(response.data.total ?? resultUsers.length);
        setCurrentPage(page);
      }
    } catch (err) {
      setError("Failed to load users. Please try again later.");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterRole, filterStatus]);

  useEffect(() => {
    if (debouncedSearchTerm || filterRole || filterStatus || initialUsers.length === 0) {
      queueMicrotask(() => fetchUsers(1));
    } else {
      queueMicrotask(() => {
        setCurrentPage(1);
        setTotalCount(initialUsers.length);
      });
    }
  }, [debouncedSearchTerm, fetchUsers, initialUsers.length, filterRole, filterStatus]);

  const handleDelete = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    try {
      await adminService.removeUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
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
    const prev = [...users];
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, banned: true } : u
      )
    );
    try {
      await adminService.banUser(userId, reason);
      toast.success("User banned", {
        description: `User has been banned. Reason: ${reason}`,
      });
    } catch (err) {
      setUsers(prev);
      toast.error("Failed to ban user", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  const handleUnban = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    const prev = [...users];
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, banned: false } : u
      )
    );
    try {
      await adminService.unbanUser(userId);
      toast.success("User unbanned", {
        description: `${user?.name || user?.email || userId} has been unbanned.`,
      });
    } catch (err) {
      setUsers(prev);
      toast.error("Failed to unban user", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Row */}
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
          onPageChange={(page) => fetchUsers(page)}
          onEdit={(user) => {
            setUserDialogMode("edit");
            setUserDialogUser(user);
            setShowUserDialog(true);
            setUserDialogKey((k) => k + 1);
          }}
          onDelete={handleDelete}
          onBan={handleBan}
          onUnban={handleUnban}
          isLoading={loading}
        />

        <UserDialog
          key={userDialogKey}
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          mode={userDialogMode}
          user={userDialogUser}
          onSuccess={() => fetchUsers(1)}
        />
      </div>
    </div>
  );
}
