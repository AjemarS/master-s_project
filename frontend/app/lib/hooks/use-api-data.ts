import useSWR, { useSWRConfig } from "swr";
import type { SWRConfiguration } from "swr";
import { useApiGet, useApiMutation } from "./use-api";
import type { Product, Category, Warehouse, Stock, StockMovement, Supplier, GoodsReceiptNote, Order, OrderDetail } from "~/lib/types";
import { authClient } from "~/lib/auth-client";
import { productApi, categoryApi, warehouseApi, stockApi, supplierApi, goodsReceiptApi, orderApi, stockMovementApi, stockTransferApi, stockAdjustApi } from "~/lib/api/admin-api";

export function useProducts(params?: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) q.append(k, String(v));
    }
  }
  const key = `/products/?${q}`;
  return useApiGet<{ results: Product[]; count: number }>(key, () => productApi.getAll(params as Record<string, string | number | boolean | undefined>));
}

export function useProduct(id: number) {
  return useApiGet<Product>(`/products/${id}`, () => productApi.getById(id));
}

export function useLowStock(threshold = 10, config?: SWRConfiguration<Product[]>) {
  return useApiGet<Product[]>(`/products/low_stock?threshold=${threshold}`, () => productApi.getLowStock(threshold), config);
}

export function useCreateProduct() {
  return useApiMutation<Product, Partial<Product>>("products-create", (p) => productApi.create(p));
}

export function useUpdateProduct() {
  return useApiMutation<Product, { id: number; data: Partial<Product> }>("products-update", ({ id, data }) => productApi.update(id, data));
}

export function useDeleteProduct() {
  return useApiMutation<void, number>("products-delete", (id) => productApi.delete(id));
}

export function useCategories() {
  return useApiGet<{ results: Category[]; count: number }>("/categories", () => categoryApi.getAll());
}

export function useOrders(params?: { page?: number; status?: string; channel?: string; search?: string; ordering?: string }, config?: SWRConfiguration<{ results: Order[]; count: number; next: string | null; previous: string | null }>) {
  const q = new URLSearchParams();
  if (params?.page) q.append("page", String(params.page));
  if (params?.status) q.append("status", params.status);
  if (params?.channel) q.append("channel", params.channel);
  if (params?.search) q.append("search", params.search);
  if (params?.ordering) q.append("ordering", params.ordering);
  return useApiGet<{ results: Order[]; count: number; next: string | null; previous: string | null }>(
    `/orders/?${q}`, () => orderApi.getAll(params), config
  );
}

export function useOrder(id: number) {
  return useApiGet<OrderDetail>(`/orders/${id}`, () => orderApi.getById(id));
}

export function useUpdateOrderStatus() {
  return useApiMutation<OrderDetail, { id: number; status: string }>(
    "orders-status",
    ({ id, status }) => orderApi.updateStatus(id, status)
  );
}

export function useWarehouses(params?: undefined, config?: SWRConfiguration<{ results: Warehouse[]; count: number }>) {
  return useApiGet<{ results: Warehouse[]; count: number }>("/warehouses", () => warehouseApi.getAll(), config);
}

export function useCreateWarehouse() {
  return useApiMutation<Warehouse, Partial<Warehouse>>("warehouses-create", (d) => warehouseApi.create(d));
}

export function useUpdateWarehouse() {
  return useApiMutation<Warehouse, { id: number; data: Partial<Warehouse> }>("warehouses-update", ({ id, data }) =>
    warehouseApi.update(id, data)
  );
}

export function useDeleteWarehouse() {
  return useApiMutation<void, number>("warehouses-delete", (id) => warehouseApi.delete(id));
}

export function useStock(params?: { warehouse_id?: number; product_id?: number; pageSize?: number }, config?: SWRConfiguration<Stock[]>) {
  const q = new URLSearchParams();
  if (params?.warehouse_id) q.append("warehouse_id", String(params.warehouse_id));
  if (params?.product_id) q.append("product_id", String(params.product_id));
  if (params?.pageSize) q.append("page_size", String(params.pageSize));
  return useApiGet<Stock[]>(`/stock/?${q}`, () => stockApi.getAll(params), config);
}

export function useSuppliers() {
  return useApiGet<{ results: Supplier[]; count: number }>("/suppliers", () => supplierApi.getAll());
}

export function useGoodsReceipts() {
  return useApiGet<{ results: GoodsReceiptNote[]; count: number }>("/goods-receipts", () => goodsReceiptApi.getAll());
}

export function useCreateSupplier() {
  return useApiMutation<Supplier, Partial<Supplier>>("suppliers-create", (d) => supplierApi.create(d));
}

export function useUpdateSupplier() {
  return useApiMutation<Supplier, { id: number; data: Partial<Supplier> }>("suppliers-update", ({ id, data }) =>
    supplierApi.update(id, data)
  );
}

export function useDeleteSupplier() {
  return useApiMutation<void, number>("suppliers-delete", (id) => supplierApi.delete(id));
}

export function useCreateGoodsReceipt() {
  return useApiMutation<GoodsReceiptNote, Partial<GoodsReceiptNote>>(
    "goods-receipts-create", (d) => goodsReceiptApi.create(d)
  );
}

export function useUpdateGoodsReceipt() {
  return useApiMutation<GoodsReceiptNote, { id: number; data: Partial<GoodsReceiptNote> }>(
    "goods-receipts-update", ({ id, data }) => goodsReceiptApi.update(id, data)
  );
}

export function useDeleteGoodsReceipt() {
  return useApiMutation<void, number>("goods-receipts-delete", (id) => goodsReceiptApi.delete(id));
}

export function useTransferStock() {
  return useApiMutation<{ message: string; movements: { from: number; to: number } }, {
    product_id: number; from_warehouse_id: number; to_warehouse_id: number;
    quantity: number; reference_type?: string; reference_id?: string; notes?: string;
  }>("stock-transfer", (d) => stockTransferApi.transfer(d));
}

export function useAdjustStock() {
  return useApiMutation<unknown, {
    product_id: number; warehouse_id: number; new_quantity: number; reason?: string;
  }>("stock-adjust", (d) => stockAdjustApi.adjust(d));
}

export function useStockMovements(params?: Record<string, string | number | undefined>, config?: SWRConfiguration<{ results: StockMovement[]; count: number }>) {
  const q = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) q.append(k, String(v));
    }
  }
  return useApiGet<{ results: StockMovement[]; count: number }>(
    `/stock/movements/?${q}`, () => stockMovementApi.getAll(params as Record<string, string | number | undefined>), config
  );
}

async function usersFetcher(query: Record<string, unknown>) {
  const res = await authClient.admin.listUsers({ query });
  if (res.error) throw new Error(res.error.message || "Failed to load users");
  return res.data!;
}

export function useUsers(searchTerm?: string, filterRole?: string, filterStatus?: string, page = 1, pageSize = 20) {
  const params: Record<string, unknown> = {
    searchValue: searchTerm || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
  if (filterRole) {
    params.filterField = "role";
    params.filterValue = filterRole;
    params.filterOperator = "eq";
  } else if (filterStatus === "active") {
    params.filterField = "banned";
    params.filterValue = false;
    params.filterOperator = "eq";
  } else if (filterStatus === "banned") {
    params.filterField = "banned";
    params.filterValue = true;
    params.filterOperator = "eq";
  }

  const key = JSON.stringify({ type: "users", ...params });
  const { data, error, isLoading, mutate } = useSWR(key, () => usersFetcher(params), {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  let users = data?.users ?? [];
  if (filterRole && filterStatus === "active") {
    users = users.filter((u) => u.role === filterRole && !u.banned);
  } else if (filterRole && filterStatus === "banned") {
    users = users.filter((u) => u.role === filterRole && u.banned);
  }

  return { users, total: data?.total ?? 0, error: error?.message || null, isLoading, mutate };
}

export function useBanUser() {
  const { mutate: globalMutate } = useSWRConfig();
  return {
    trigger: async (userId: string, reason?: string) => {
      const res = await authClient.admin.banUser({ userId, banReason: reason });
      if (res.error) throw new Error(res.error.message);
      globalMutate((k: string) => typeof k === "string" && k.startsWith('{"type":"users'));
    },
  };
}

export function useUnbanUser() {
  const { mutate: globalMutate } = useSWRConfig();
  return {
    trigger: async (userId: string) => {
      const res = await authClient.admin.unbanUser({ userId });
      if (res.error) throw new Error(res.error.message);
      globalMutate((k: string) => typeof k === "string" && k.startsWith('{"type":"users'));
    },
  };
}

export function useDeleteUser() {
  const { mutate: globalMutate } = useSWRConfig();
  return {
    trigger: async (userId: string) => {
      const res = await authClient.admin.removeUser({ userId });
      if (res.error) throw new Error(res.error.message);
      globalMutate((k: string) => typeof k === "string" && k.startsWith('{"type":"users'));
    },
  };
}
