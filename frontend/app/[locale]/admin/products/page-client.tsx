"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Badge } from "~/ui/primitives/badge";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { Label } from "~/ui/primitives/label";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Filter,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { productApi, categoryApi } from "~/lib/api/admin-api";
import type { Product, Category } from "~/lib/types";
import { ConfirmDialog, TableSkeleton, StatsGridSkeleton } from "../components";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { useRecentProducts } from "~/lib/hooks/use-recent-products";
import { useCurrentUser } from "~/lib/auth-client";
import { ProductFormDialog } from "./product-form-dialog";

const PAGE_SIZE = 20;

export default function AdminProductsClient({
  initialProducts,
  initialTotalCount,
  initialError,
}: {
  initialProducts: Product[];
  initialTotalCount: number;
  initialError: string | null;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMinStock, setFilterMinStock] = useState("");
  const [filterMaxStock, setFilterMaxStock] = useState("");
  const [filterInStock, setFilterInStock] = useState<boolean | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: number | null;
    productName: string;
  }>({ open: false, productId: null, productName: "" });
  const [deleting, setDeleting] = useState(false);
  const hasRetriedRef = useRef(false);

  const [categories, setCategories] = useState<Category[]>([]);

  // Note: ProductFormDialog state lives inside that component.
  // The page only controls whether it's shown and in which mode.
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formDialogMode, setFormDialogMode] = useState<"create" | "edit">("create");
  const [formDialogProduct, setFormDialogProduct] = useState<Product | null>(null);
  const [formDialogKey, setFormDialogKey] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { addProduct: addRecentProduct } = useRecentProducts();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    categoryApi.getAll().then((res) => {
      if (res.data) setCategories(res.data.results || []);
    });
  }, []);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productApi.getAll({
        search: debouncedSearchTerm || undefined,
        page,
        pageSize: PAGE_SIZE,
        minPrice: filterMinPrice ? parseFloat(filterMinPrice) : undefined,
        maxPrice: filterMaxPrice ? parseFloat(filterMaxPrice) : undefined,
        minStock: filterMinStock ? parseInt(filterMinStock, 10) : undefined,
        maxStock: filterMaxStock ? parseInt(filterMaxStock, 10) : undefined,
        inStock: filterInStock,
        category: filterCategory ? parseInt(filterCategory, 10) : undefined,
        createdAfter: filterDateFrom || undefined,
        createdBefore: filterDateTo || undefined,
        ordering: sortField ? (sortDir === "desc" ? `-${sortField}` : sortField) : undefined,
      });
      if (response.error) {
        setError(response.error.message);
        toast.error("Помилка завантаження", {
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
        setTotalCount(response.data.count);
        setCurrentPage(page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не вдалося завантажити товари";
      setError(message);
      toast.error("Помилка", { description: message });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterMinPrice, filterMaxPrice, filterMinStock, filterMaxStock, filterInStock, filterCategory, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Refetch when debounced search term changes, or fallback-fetch
  // when the server-side fetch (in Docker) returned empty data.
  useEffect(() => {
    if (debouncedSearchTerm) {
      queueMicrotask(() => fetchProducts(1));
      return;
    }

    if (initialProducts.length > 0) {
      queueMicrotask(() => {
        setProducts(initialProducts);
        setCurrentPage(1);
      });
      return;
    }

    // Server returned empty — retry from browser once.
    // initialProducts is from the server component and won't change,
    // so this runs at most once per mount.
    if (!hasRetriedRef.current) {
      hasRetriedRef.current = true;
      fetchProducts(1);
    }
  }, [debouncedSearchTerm, fetchProducts, initialProducts]);

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
        toast.error("Не вдалося видалити", {
          description: response.error.message,
        });
      } else {
        setProducts(products.filter((p) => p.id !== deleteDialog.productId));
        toast.success("Товар видалено", {
          description: `${deleteDialog.productName} видалено.`,
        });
        setDeleteDialog({ open: false, productId: null, productName: "" });
      }
    } catch (err) {
      toast.error("Помилка", {
        description: err instanceof Error ? err.message : "Не вдалося видалити товар",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddClick = () => {
    setFormDialogMode("create");
    setFormDialogProduct(null);
    setShowFormDialog(true);
    setFormDialogKey((k) => k + 1);
  };

  const handleEditClick = (product: Product) => {
    setFormDialogMode("edit");
    setFormDialogProduct(product);
    setShowFormDialog(true);
    setFormDialogKey((k) => k + 1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  const handleExport = () => {
    const headers = ["ID", "Назва", "Категорія", "Ціна", "Початкова ціна", "Залишок", "В наявності", "Опис"];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.category_name || "").replace(/"/g, '""')}"`,
      p.price,
      p.original_price || "",
      p.stock,
      p.in_stock ? "Так" : "Ні",
      `"${(p.description || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Експорт завершено", { description: `Експортовано ${products.length} товарів.` });
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
              На головну
            </Button>
          </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
                  <Package className="h-10 w-10 text-purple-600" />
                  Керування товарами
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Каталог, ціни та залишки</p>
              </div>
              {isAdmin && (
                <Button className="flex items-center gap-2" onClick={handleAddClick}>
                  <Plus className="h-4 w-4" />
                  Додати товар
                </Button>
              )}
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
                <div className="text-sm text-slate-600 dark:text-slate-400">Всього товарів</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">В наявності</div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">Малий залишок</div>
                <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800/80 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">Вартість запасів</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalValue.toFixed(2)} ₴</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="dark:bg-slate-800/80 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-slate-100">Каталог товарів</CardTitle>
                <CardDescription className="dark:text-slate-400">Керування асортиментом та цінами</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowFilters(!showFilters); if (!showFilters) setCurrentPage(1); }}>
                  {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                  {showFilters ? "Закрити" : "Фільтр"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Експорт
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Пошук товарів за назвою..."
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
                    <Label className="text-xs text-slate-500">Категорія</Label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Всі категорії</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="minPrice" className="text-xs text-slate-500">Мін. ціна</Label>
                    <Input id="minPrice" type="number" step="0.01" min="0" placeholder="0.00"
                      value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} className="w-28" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="maxPrice" className="text-xs text-slate-500">Макс. ціна</Label>
                    <Input id="maxPrice" type="number" step="0.01" min="0" placeholder="999.99"
                      value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} className="w-28" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Мін. залишок</Label>
                    <Input type="number" min="0" placeholder="0"
                      value={filterMinStock} onChange={(e) => setFilterMinStock(e.target.value)} className="w-24" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Макс. залишок</Label>
                    <Input type="number" min="0" placeholder="9999"
                      value={filterMaxStock} onChange={(e) => setFilterMaxStock(e.target.value)} className="w-24" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Дата від</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-36" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-slate-500">Дата до</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-36" />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input id="inStock" type="checkbox" checked={filterInStock === true}
                      onChange={(e) => setFilterInStock(e.target.checked || undefined)}
                      className="h-4 w-4 rounded border-gray-300" />
                    <Label htmlFor="inStock" className="text-xs text-slate-500 cursor-pointer">Тільки в наявності</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setCurrentPage(1); fetchProducts(1); }}>
                      Застосувати
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setFilterMinPrice(""); setFilterMaxPrice("");
                      setFilterMinStock(""); setFilterMaxStock("");
                      setFilterInStock(undefined); setFilterCategory("");
                      setFilterDateFrom(""); setFilterDateTo("");
                      setSortField(""); setSortDir("desc");
                      setCurrentPage(1);
                    }}>
                      Скинути
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : (
              <div className="border rounded-lg overflow-x-auto dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 w-10"></th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => handleSort("id")}>
                        ID {renderSortIcon("id")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => handleSort("name")}>
                        Назва {renderSortIcon("name")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Категорія</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => handleSort("price")}>
                        Ціна {renderSortIcon("price")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none" onClick={() => handleSort("stock")}>
                        Залишок {renderSortIcon("stock")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Статус</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          {searchTerm
                            ? "Нічого не знайдено за вашим запитом"
                            : "Немає товарів"}
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <Fragment key={product.id}>
                          <tr
                            className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => {
                              const id = product.id;
                              setExpandedId(expandedId === id ? null : id);
                              if (expandedId !== id) {
                                addRecentProduct({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url });
                              }
                            }}
                          >
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100 w-10">
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === product.id ? "rotate-180" : ""}`} />
                            </td>
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">#{product.id}</td>
                            <td className="p-4 font-medium dark:text-slate-200">{product.name}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{product.category_name || "N/A"}</td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">₴{Number(product.price).toFixed(2)}</td>
                            <td className="p-4">
                              <Badge variant={product.stock < 10 ? "destructive" : product.stock < 50 ? "outline" : "default"}>
                                {product.stock} units
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant={product.in_stock ? "default" : "secondary"}>
                                {product.in_stock ? "В наявності" : "Немає"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                {isAdmin && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEditClick(product); }} title="Edit product">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(product); }} title="Delete product">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedId === product.id && (
                            <tr key={`${product.id}-detail`} className="bg-slate-50 dark:bg-slate-800/30 border-b dark:border-slate-700">
                              <td colSpan={8} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div className="space-y-2">
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">ID:</span> <span className="text-slate-900 dark:text-slate-100">#{product.id}</span></div>
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Категорія:</span> <span className="text-slate-900 dark:text-slate-100">{product.category_name || "N/A"}</span></div>
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Ціна:</span> <span className="font-semibold text-slate-900 dark:text-slate-100">₴{Number(product.price).toFixed(2)}</span></div>
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Ориг. ціна:</span> <span className="text-slate-500 line-through">₴{Number(product.original_price).toFixed(2)}</span></div>
                                  </div>
                                  <div className="space-y-2">
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Залишок:</span> <span className="text-slate-900 dark:text-slate-100">{product.stock} од.</span></div>
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Рейтинг:</span> <span className="text-slate-900 dark:text-slate-100">{Number(product.rating).toFixed(1)} / 5</span></div>
                                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Статус:</span> <span className="text-slate-900 dark:text-slate-100">{product.in_stock ? "В наявності" : "Немає"}</span></div>
                                    {product.image_url && (
                                      <div><span className="font-medium text-slate-600 dark:text-slate-400">Зображення:</span> <span className="text-slate-500 text-xs truncate block max-w-[200px]">{product.image_url}</span></div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="font-medium text-slate-600 dark:text-slate-400">Опис:</div>
                                    <p className="text-slate-900 dark:text-slate-100 line-clamp-3">{product.description || "Немає опису"}</p>
                                    {product.features && product.features.length > 0 && (
                                      <>
                                        <div className="font-medium text-slate-600 dark:text-slate-400">Особливості:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {product.features.map((f, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
                onClick={() => fetchProducts(currentPage - 1)}
              >
                Попередня
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || loading}
                onClick={() => fetchProducts(currentPage + 1)}
              >
                Наступна
              </Button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          onConfirm={handleDeleteConfirm}
          title="Видалити товар"
          description={`Ви впевнені, що хочете видалити "${deleteDialog.productName}"? Цю дію не можна скасувати.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={deleting}
        />

        <ProductFormDialog
          key={formDialogKey}
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          mode={formDialogMode}
          product={formDialogProduct}
          categories={categories}
          onSuccess={fetchProducts}
          onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
        />
      </div>
    </div>
  );
}