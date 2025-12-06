"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Users, Package, BarChart3, Search, Plus, Edit, Trash2, AlertCircle } from "lucide-react";

// Types
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  status: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  lowStock: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("summary");
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch users from better-auth
  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost/auth/admin/users", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users || []);

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalUsers: data.users?.length || 0,
        activeUsers: data.users?.filter((u: User) => u.status === "active").length || 0,
      }));
    } catch (err) {
      setError("Failed to load users. Make sure better-auth service is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products from Django API
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost/api/products/", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      setProducts(data.results || data || []);

      // Update stats
      const productList = data.results || data || [];
      setStats((prev) => ({
        ...prev,
        totalProducts: productList.length,
        lowStock: productList.filter((p: Product) => p.stock < 10).length,
      }));
    } catch (err) {
      setError("Failed to load products. Make sure Django API is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost/auth/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      setError("Failed to delete user");
      console.error(err);
    }
  };

  // Delete product
  const deleteProduct = async (productId: number) => {
    try {
      const response = await fetch(`http://localhost/api/products/${productId}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (err) {
      setError("Failed to delete product");
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "products") {
      fetchProducts();
    } else if (activeTab === "summary") {
      fetchUsers();
      fetchProducts();
    }
  }, [activeTab]);

  // Filter data based on search
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Manage your users and products</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Summary Page */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.totalUsers}</div>
                  <p className="text-xs text-slate-500 mt-1">Registered accounts</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
                  <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.activeUsers}</div>
                  <p className="text-xs text-slate-500 mt-1">Currently active</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Products
                  </CardTitle>
                  <Package className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.totalProducts}</div>
                  <p className="text-xs text-slate-500 mt-1">In catalog</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Low Stock</CardTitle>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.lowStock}</div>
                  <p className="text-xs text-slate-500 mt-1">Items below 10 units</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Navigate to management pages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setActiveTab("users")}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                  <Button
                    onClick={() => setActiveTab("products")}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Manage Products
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Backend services health</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">Better-Auth Service</span>
                    <Badge variant={users.length > 0 ? "default" : "secondary"}>
                      {users.length > 0 ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">Django API</span>
                    <Badge variant={products.length > 0 ? "default" : "secondary"}>
                      {products.length > 0 ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Page */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products Management</CardTitle>
                    <CardDescription>Django REST Framework API</CardDescription>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading products...</div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">ID</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Name</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Category
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Price
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Stock
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Status
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-slate-600">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              No products found
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((product) => (
                            <tr key={product.id} className="border-b hover:bg-slate-50">
                              <td className="p-4 font-medium">{product.id}</td>
                              <td className="p-4">{product.name}</td>
                              <td className="p-4">{product.category}</td>
                              <td className="p-4">${product.price?.toFixed(2)}</td>
                              <td className="p-4">
                                <Badge variant={product.stock < 10 ? "destructive" : "default"}>
                                  {product.stock}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant={product.status === "active" ? "default" : "secondary"}
                                >
                                  {product.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteProduct(product.id)}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Page */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users Management</CardTitle>
                    <CardDescription>Better-Auth Admin Panel</CardDescription>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading users...</div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">ID</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Name</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Email
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Role</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Status
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">
                            Created
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-slate-600">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              No users found
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-slate-50">
                              <td className="p-4 font-medium">{user.id.slice(0, 8)}...</td>
                              <td className="p-4">{user.name}</td>
                              <td className="p-4">{user.email}</td>
                              <td className="p-4">
                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                  {user.role}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                                  {user.status}
                                </Badge>
                              </td>
                              <td className="p-4">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteUser(user.id)}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
