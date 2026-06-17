"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Filter,
  Download,
} from "lucide-react";
import { productApi } from "~/lib/api/admin-api";
import type { Product } from "~/lib/types";
import { ConfirmDialog, TableSkeleton, StatsGridSkeleton } from "../components";
import { useDebounce } from "~/lib/hooks/use-debounce";

export default function AdminProductsClient({
  initialProducts,
  initialError,
}: {
  initialProducts: Product[];
  initialError: string | null;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: number | null;
    productName: string;
  }>({ open: false, productId: null, productName: "" });
  const [deleting, setDeleting] = useState(false);

  // Refetch when debounced search term changes, or fallback-fetch
  // when the server-side fetch (in Docker) returned empty data.
  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchProducts();
    } else if (initialProducts.length === 0 && !loading) {
      // Server-side fetch likely failed (e.g. inside Docker where
      // localhost doesn't resolve to the gateway).  Retry from the
      // browser where the client-side URL works.
      fetchProducts();
    } else {
      setProducts(initialProducts);
    }
  }, [debouncedSearchTerm]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productApi.getAll({ search: debouncedSearchTerm || undefined });
      if (response.error) {
        setError(response.error.message);
        toast.error("Failed to load products", {
          description: response.error.message,
        });
      } else if (response.data) {
        const products = response.data.results.map((product: Product) => ({
          ...product,
          price: Number(product.price),
          original_price: Number(product.original_price),
          rating: Number(product.rating),
        }));
        setProducts(products);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load products";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteDialog({
      open: true,
      productId: product.id,
      productName: product.name,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.productId) return;
    setDeleting(true);
    try {
      const response = await productApi.delete(deleteDialog.productId);
      if (response.error) {
        toast.error("Failed to delete product", {
          description: response.error.message,
        });
      } else {
        setProducts(products.filter((p) => p.id !== deleteDialog.productId));
        toast.success("Product deleted", {
          description: `${deleteDialog.productName} has been deleted.`,
        });
        setDeleteDialog({ open: false, productId: null, productName: "" });
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Failed to delete product",
      });
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: products.length,
    active: products.filter((p) => p.in_stock).length,
    lowStock: products.filter((p) => p.stock < 10).length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
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
                <Package className="h-10 w-10 text-purple-600" />
                Products Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Django REST Framework API Integration</p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <StatsGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Products</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">In Stock</div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">Low Stock</div>
                <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Value</div>
                <div className="text-2xl font-bold text-blue-600">${stats.totalValue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">Product Catalog</CardTitle>
                <CardDescription className="dark:text-slate-400">Manage your inventory and pricing</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Search products by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">ID</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Product Name</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Category</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Price</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Stock</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {searchTerm
                            ? "No products found matching your search"
                            : "No products available"}
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{product.id}</td>
                          <td className="p-4 font-medium dark:text-slate-200">{product.name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{product.category_name || "N/A"}</td>
                          <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">${Number(product.price).toFixed(2)}</td>
                          <td className="p-4">
                            <Badge variant={product.stock < 10 ? "destructive" : product.stock < 50 ? "outline" : "default"}>
                              {product.stock} units
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={product.in_stock ? "default" : "secondary"}>
                              {product.in_stock ? "In Stock" : "Out of Stock"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" title="Edit product">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(product)} title="Delete product">
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

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          onConfirm={handleDeleteConfirm}
          title="Delete Product"
          description={`Are you sure you want to delete "${deleteDialog.productName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={deleting}
        />
      </div>
    </div>
  );
}