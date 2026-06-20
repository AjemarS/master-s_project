"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Label } from "~/ui/primitives/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import {
  Users,
  Search,
  Plus,
  AlertCircle,
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  Pencil,
  Ban,
  CheckCircle,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import { UserWithRole } from "better-auth/plugins/admin";
import { adminService } from "./actions";
import { TableSkeleton } from "../components";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { UserDialog } from "./user-dialog";

interface UsersPageClientProps {
  initialUsers: UserWithRole[];
  initialError: string | null;
}

export default function UsersPageClient({ initialUsers, initialError }: UsersPageClientProps) {
  const PAGE_SIZE = 20;

  const [users, setUsers] = useState<UserWithRole[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [loading, setLoading] = useState(initialUsers.length === 0);
  const [error, setError] = useState<string | null>(initialError);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialUsers.length);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const [banDialog, setBanDialog] = useState<{
    open: boolean;
    userId: string | null;
    reason: string;
  }>({ open: false, userId: null, reason: "" });

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<"create" | "edit">("create");
  const [userDialogUser, setUserDialogUser] = useState<UserWithRole | null>(null);
  const [userDialogKey, setUserDialogKey] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
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

      // Server-side filter: only one filterField at a time
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
        // Client-side filter: when both role and status are active
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

  const handleDeleteUser = (user: UserWithRole) => {
    setConfirmDialog({
      open: true,
      title: "Remove User",
      description: `Are you sure you want to permanently remove ${user.name || user.email}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await adminService.removeUser(user.id);
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          toast.success("User removed", {
            description: `${user.name || user.email} has been removed.`,
          });
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          toast.error("Failed to remove user", {
            description: err instanceof Error ? err.message : "An unexpected error occurred.",
          });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              На головну
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Users className="h-10 w-10 text-blue-600" />
                Користувачі
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Керування обліковими записами</p>
            </div>
            <Button className="flex items-center gap-2" onClick={() => { setUserDialogMode("create"); setUserDialogUser(null); setShowUserDialog(true); setUserDialogKey((k) => k + 1); }}>
              <Plus className="h-4 w-4" />
              Додати
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
              <div className="text-sm text-slate-600 dark:text-slate-400">Активні</div>
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u) => !u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">Заблоковані</div>
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

        {/* Main Content */}
        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">User Accounts</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Manage user roles, permissions, and account status
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                {showFilters ? "Закрити" : "Фільтр"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search  */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Пошук за ім'ям, email або роллю..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Role</Label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">All roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Status</Label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">All statuses</option>
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pb-px">
                    <Button size="sm" onClick={() => { setCurrentPage(1); fetchUsers(1); }}>
                      Apply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setFilterRole("");
                      setFilterStatus("");
                      setCurrentPage(1);
                    }}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">User</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Role</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Joined</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Users className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {searchTerm
                            ? "No users found matching your search"
                            : "No users available"}
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {user.name || "Unknown"}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {user.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={user.role === "admin" ? "default" : "secondary"}
                              className="flex items-center gap-1 w-fit"
                            >
                              {user.role === "admin" && <Shield className="h-3 w-3" />}
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {user.banned ? (
                              <Badge
                                variant="destructive"
                                className="flex items-center gap-1 w-fit"
                              >
                                <Ban className="h-3 w-3" />
                                Banned
                              </Badge>
                            ) : (
                              <Badge
                                variant="default"
                                className="flex items-center gap-1 w-fit bg-green-600"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                title="Edit user"
                                onClick={() => {
                                  setUserDialogMode("edit");
                                  setUserDialogUser(user);
                                  setShowUserDialog(true);
                                  setUserDialogKey((k) => k + 1);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {user.banned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={() => {
                                    setConfirmDialog({
                                      open: true,
                                      title: "Unban User",
                                      description: `Are you sure you want to unban ${user.name || user.email}?`,
                                      onConfirm: async () => {
                                        const prev = [...users];
                                        setUsers((prev) =>
                                          prev.map((u) =>
                                            u.id === user.id ? { ...u, banned: false } : u
                                          )
                                        );
                                        try {
                                          await adminService.unbanUser(user.id);
                                          setConfirmDialog((prev) => ({ ...prev, open: false }));
                                          toast.success("User unbanned", {
                                            description: `${user.name || user.email} has been unbanned.`,
                                          });
                                        } catch (err) {
                                          setUsers(prev);
                                          setConfirmDialog((prev) => ({ ...prev, open: false }));
                                          toast.error("Failed to unban user", {
                                            description: err instanceof Error ? err.message : "An unexpected error occurred.",
                                          });
                                        }
                                      },
                                    });
                                  }}
                                  title="Unban user"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                                  onClick={() => {
                                    setBanDialog({ open: true, userId: user.id, reason: "" });
                                  }}
                                  title="Ban user"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user)}
                                title="Remove user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Better-Auth Admin Features Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Better-Auth Admin Features</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• List all users with detailed information</li>
                    <li>• Ban/Unban users with optional reason and expiry</li>
                    <li>• Set user roles (admin, user, etc.)</li>
                    <li>• Remove users permanently from the system</li>
                    <li>• All actions are logged for security audit</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchUsers(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || loading}
                onClick={() => fetchUsers(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Dialog for Role Change / Unban */}
        <Dialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button variant="default" onClick={confirmDialog.onConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban Dialog */}
        <Dialog
          open={banDialog.open}
          onOpenChange={(open) => setBanDialog((prev) => ({ ...prev, open }))}
        >
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
                value={banDialog.reason}
                onChange={(e) => setBanDialog((prev) => ({ ...prev, reason: e.target.value }))}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBanDialog({ open: false, userId: null, reason: "" })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!banDialog.reason.trim()}
                onClick={async () => {
                  if (banDialog.userId && banDialog.reason.trim()) {
                    const prev = [...users];
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === banDialog.userId ? { ...u, banned: true } : u
                      )
                    );
                    try {
                      await adminService.banUser(banDialog.userId, banDialog.reason);
                      setBanDialog({ open: false, userId: null, reason: "" });
                      toast.success("User banned", {
                        description: `User has been banned. Reason: ${banDialog.reason}`,
                      });
                    } catch (err) {
                      setUsers(prev);
                      setBanDialog({ open: false, userId: null, reason: "" });
                      toast.error("Failed to ban user", {
                        description: err instanceof Error ? err.message : "An unexpected error occurred.",
                      });
                    }
                  }
                }}
              >
                Ban User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
