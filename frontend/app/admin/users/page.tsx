"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import {
  Users,
  Search,
  Plus,
  AlertCircle,
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  UserCog,
  Ban,
  CheckCircle,
} from "lucide-react";
import { UserWithRole } from "better-auth/plugins/admin";
import { adminService } from "./actions";

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await adminService.listUsers({ searchValue: searchTerm });
        if (response.data) setUsers(response.data.users);
      } catch (err) {
        setError("Failed to load users. Please try again later.");
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/summary">
            <Button variant="ghost" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Summary
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                <Users className="h-10 w-10 text-blue-600" />
                Users Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Better-Auth Admin Plugin Integration</p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Invite User
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
              <div className="text-sm text-slate-600 dark:text-slate-400">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u) => !u.banned).length}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800/80 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">Banned</div>
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
            </div>
          </CardHeader>
          <CardContent>
            {/* Search  */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-4 animate-pulse text-slate-300 dark:text-slate-600" />
                Loading users...
              </div>
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
                                title="Change role"
                                onClick={() => {
                                  const newRole = user.role === "admin" ? "user" : "admin";
                                  if (confirm(`Change role to ${newRole}?`)) {
                                    adminService.setUserRole(user.id, newRole);
                                  }
                                }}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                              {user.banned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={() => adminService.unbanUser(user.id)}
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
                                    const reason = prompt("Ban reason:");
                                    if (reason) adminService.banUser(user.id, reason);
                                  }}
                                  title="Ban user"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
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
      </div>
    </div>
  );
}