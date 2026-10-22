"use client";

import { formatDate } from "~/lib/utils/format";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
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
  UserCheck,
} from "lucide-react";
import type { UserWithRole } from "better-auth/plugins/admin";
import { DataTable, type Column, ConfirmDialog } from "../components";
import { BanDialog } from "./ban-dialog";

interface UserTableProps {
  users: UserWithRole[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: UserWithRole) => void;
  onDelete: (userId: string) => Promise<void>;
  onBan: (userId: string, reason: string) => Promise<void>;
  onUnban: (userId: string) => Promise<void>;
  onImpersonate: (user: UserWithRole) => Promise<void>;
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
  onApplyFilters,
  onResetFilters,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onBan,
  onUnban,
  onImpersonate,
  isLoading,
}: UserTableProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const ti = useTranslations("impersonation");
  const locale = useLocale();
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
    setConfirmTitle(t("removeTitle"));
    setConfirmDescription(t("removeConfirm", { name: user.name || user.email }));
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
    setConfirmTitle(t("unbanTitle"));
    setConfirmDescription(t("unbanConfirm", { name: user.name || user.email }));
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

  const handleImpersonateClick = (user: UserWithRole) => {
    setConfirmTitle(ti("impersonateUser"));
    setConfirmDescription(ti("confirmImpersonate", { name: user.name || user.email }));
    setConfirmVariant("default");
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        await onImpersonate(user);
        setConfirmOpen(false);
      } finally {
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const columns: Column<UserWithRole>[] = [
    {
      id: "user",
      header: t("user"),
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-medium">{user.name || t("unknown")}</div>
            <div className="text-sm text-muted-foreground">{user.id.slice(0, 8)}...</div>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: t("email"),
      cell: (user) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          {user.email}
        </div>
      ),
    },
    {
      id: "role",
      header: t("role"),
      cell: (user) => (
        <Badge variant={user.role === "admin" ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
          {user.role === "admin" && <Shield className="h-3 w-3" />}
          {t(user.role === "warehouse_worker" ? "warehouseWorker" : user.role === "admin" || user.role === "cashier" ? user.role : "user")}
        </Badge>
      ),
    },
    {
      id: "status",
      header: t("status"),
      cell: (user) =>
        user.banned ? (
          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
            <Ban className="h-3 w-3" aria-hidden /> {t("banned")}
          </Badge>
        ) : (
          <Badge variant="default" className="flex items-center gap-1 w-fit bg-primary">
            <CheckCircle className="h-3 w-3" aria-hidden /> {t("active")}
          </Badge>
        ),
    },
    {
      id: "joined",
      header: t("createdAt"),
      cell: (user) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formatDate(String(user.createdAt), locale)}
        </div>
      ),
    },
    {
      id: "actions",
      header: t("actions"),
      headerClassName: "text-right",
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" title={ti("impersonate")} aria-label={ti("impersonate")} onClick={() => handleImpersonateClick(user)}>
            <UserCheck className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" title={t("editUser")} aria-label={t("editUser")} onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {user.banned ? (
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => handleUnbanClick(user)} title={t("unbanUser")} aria-label={t("unbanUser")}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="border-accent-electric text-accent-electric hover:bg-accent-electric/10" onClick={() => handleBanClick(user)} title={t("banUser")} aria-label={t("banUser")}>
              <Ban className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(user)} title={t("deleteUser")} aria-label={t("deleteUser")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card className="dark:bg-card dark:border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">{t("accountsTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("accountsDesc")}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                aria-label={t("search")}
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50 dark:border-border">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="users-role-filter" className="text-muted-foreground">{t("role")}</Label>
                  <Select value={roleFilter || "all"} onValueChange={(v) => onRoleFilterChange(v === "all" ? "" : v)}>
                    <SelectTrigger id="users-role-filter" className="w-40"><SelectValue placeholder={t("allRoles")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allRoles")}</SelectItem>
                      <SelectItem value="user">{t("user")}</SelectItem>
                      <SelectItem value="cashier">{t("cashier")}</SelectItem>
                      <SelectItem value="warehouse_worker">{t("warehouseWorker")}</SelectItem>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="users-status-filter" className="text-muted-foreground">{t("status")}</Label>
                  <Select value={statusFilter || "all"} onValueChange={(v) => onStatusFilterChange(v === "all" ? "" : v)}>
                    <SelectTrigger id="users-status-filter" className="w-32"><SelectValue placeholder={t("allStatuses")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allStatuses")}</SelectItem>
                      <SelectItem value="active">{t("active")}</SelectItem>
                      <SelectItem value="banned">{t("banned")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pb-px">
                  <Button size="sm" onClick={onApplyFilters}>{tc("apply")}</Button>
                  <Button size="sm" variant="outline" onClick={onResetFilters}>
                    {tc("reset")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            emptyMessage={searchTerm ? t("noUsersFound") : t("noUsers")}
            emptyIcon={Users}
            keyExtractor={(u) => u.id}
          />

          {/* Better-Auth Admin Features Info */}
          <div className="mt-6 p-4 bg-primary/10 border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary dark:text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-primary mb-1">Better-Auth Admin Features</h4>
                <ul className="text-sm text-primary/80 space-y-1">
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
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || isLoading} onClick={() => onPageChange(currentPage - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isLoading} onClick={() => onPageChange(currentPage + 1)}>
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
        onOpenChange={(open) => { setBanDialogOpen(open); if (!open) setBanningUser(null); }}
        user={banningUser}
        onConfirm={handleBanConfirm}
      />
    </>
  );
}
