"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Label } from "~/ui/primitives/label";
import {
  Search,
  Users,
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
import type { UserWithRole } from "better-auth/plugins/admin";
import { TableSkeleton, ConfirmDialog } from "../components";
import { BanDialog } from "./ban-dialog";

interface UserTableProps {
  users: UserWithRole[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: UserWithRole) => void;
  onDelete: (userId: string) => Promise<void>;
  onBan: (userId: string, reason: string) => Promise<void>;
  onUnban: (userId: string) => Promise<void>;
  isLoading: boolean;
}

export function UserTable({
  users,
  totalCount,
  currentPage,
  pageSize,
  searchTerm,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onBan,
  onUnban,
  isLoading,
}: UserTableProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const [showFilters, setShowFilters] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmVariant, setConfirmVariant] = useState<"default" | "destructive">("default");
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {});
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banningUser, setBanningUser] = useState<UserWithRole | null>(null);

  const handleDeleteClick = (user: UserWithRole) => {
    setConfirmTitle("Remove User");
    setConfirmDescription(
      `Are you sure you want to permanently remove ${user.name || user.email}? This action cannot be undone.`
    );
    setConfirmVariant("destructive");
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        await onDelete(user.id);
        setConfirmOpen(false);
      } finally {
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleUnbanClick = (user: UserWithRole) => {
    setConfirmTitle("Unban User");
    setConfirmDescription(`Are you sure you want to unban ${user.name || user.email}?`);
    setConfirmVariant("default");
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        await onUnban(user.id);
        setConfirmOpen(false);
      } finally {
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleBanConfirm = async (userId: string, reason?: string) => {
    try {
      await onBan(userId, reason ?? "");
    } finally {
      setBanDialogOpen(false);
      setBanningUser(null);
    }
  };

  const handleBanClick = (user: UserWithRole) => {
    setBanningUser(user);
    setBanDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
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
              {showFilters ? tc("close") : tc("filter")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
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
                    value={roleFilter}
                    onChange={(e) => onRoleFilterChange(e.target.value)}
                    className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All roles</option>
                    <option value="user">User</option>
                    <option value="cashier">Cashier</option>
                    <option value="warehouse_worker">Warehouse Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-slate-500">Status</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div className="flex gap-2 pb-px">
                  <Button size="sm" onClick={() => onPageChange(1)}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRoleFilterChange("");
                      onStatusFilterChange("");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
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
                      <tr
                        key={user.id}
                        className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
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
                              onClick={() => onEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {user.banned ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                onClick={() => handleUnbanClick(user)}
                                title="Unban user"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                                onClick={() => handleBanClick(user)}
                                title="Ban user"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(user)}
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
                  <li>{"\u2022"} List all users with detailed information</li>
                  <li>{"\u2022"} Ban/Unban users with optional reason and expiry</li>
                  <li>{"\u2022"} Set user roles (admin, user, etc.)</li>
                  <li>{"\u2022"} Remove users permanently from the system</li>
                  <li>{"\u2022"} All actions are logged for security audit</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Dialog for Delete / Unban */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmAction}
        title={confirmTitle}
        description={confirmDescription}
        variant={confirmVariant}
        loading={confirmLoading}
      />

      {/* Ban Dialog */}
      <BanDialog
        open={banDialogOpen}
        onOpenChange={(open) => {
          setBanDialogOpen(open);
          if (!open) {
            setBanningUser(null);
          }
        }}
        user={banningUser}
        onConfirm={handleBanConfirm}
      />
    </>
  );
}
