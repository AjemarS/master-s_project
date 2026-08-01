import { useCallback, useEffect, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import type { SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";
import { useApiGet, useApiMutation } from "./use-api";
import type { Product, Category, Warehouse, Stock, StockMovement, Supplier, GoodsReceiptNote, Order, OrderDetail } from "~/lib/types";
import { authClient } from "~/lib/auth-client";
import { productApi, categoryApi, warehouseApi, stockApi, supplierApi, goodsReceiptApi, orderApi, stockMovementApi, stockTransferApi, stockAdjustApi } from "~/lib/api/admin-api";
import { apiCall, ORDERS_API_URL } from "~/lib/api/client";
import { createNotificationSSE, notificationsApi } from "~/lib/api/notifications";
import type { NotificationListResponse } from "~/lib/api/notifications";

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
  return useApiGet<OrderDetail>(`/orders/${id}`, () => orderApi.getById(id), { keepPreviousData: false });
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

export function useGoodsReceipts(config?: SWRConfiguration<{ results: GoodsReceiptNote[]; count: number }>) {
  return useApiGet<{ results: GoodsReceiptNote[]; count: number }>("/goods-receipts", () => goodsReceiptApi.getAll(), config);
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

export function useMyOrders() {
  return useApiGet<{ results: Order[]; count: number }>("/orders/my", () => orderApi.getMy());
}

export function useCancelOrder() {
  const { mutate: globalMutate } = useSWRConfig();
  return useSWRMutation<OrderDetail, Error, string, number>(
    "cancel-order",
    async (_key, { arg }: { arg: number }) => {
      const res = await orderApi.cancel(arg);
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    {
      onSuccess: () => {
        globalMutate((k) => typeof k === "string" && k.startsWith("/orders/my"));
      },
    }
  );
}

export function useSearchProducts(search: string, pageSize = 5) {
  const trimmed = search.trim();
  const key = trimmed ? `/products/search?q=${encodeURIComponent(trimmed)}&pageSize=${pageSize}` : null;
  return useApiGet<{ results: Product[]; count: number }>(
    key,
    () => productApi.getAll({ search: trimmed, pageSize }),
  );
}

export function useWarehouseStock(warehouseId: number | null) {
  const key = warehouseId ? `/stock/?warehouse_id=${warehouseId}` : null;
  return useApiGet<Stock[]>(
    key,
    () => stockApi.getAll({ warehouse_id: warehouseId! }),
    { keepPreviousData: false },
  );
}

interface HealthServiceEntry {
  status: string;
  label?: string;
}
interface SystemHealth {
  services: Record<string, HealthServiceEntry>;
}

export function useSystemHealth() {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost/api").replace(/\/api$/, "");
  return useSWR<SystemHealth>(
    "/health",
    async () => {
      const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    },
    { refreshInterval: 30000 },
  );
}

export interface NovaPoshtaCity {
  name: string;
  ref: string;
  area?: string;
  type?: string;
}

export interface NovaPoshtaCitiesResponse {
  cities: NovaPoshtaCity[];
  error?: string;
}

export function useNovaPoshtaCities(query: string) {
  const trimmed = query.trim();
  const key = trimmed.length >= 3 ? `/np-cities?q=${encodeURIComponent(trimmed)}` : null;
  return useSWR<NovaPoshtaCitiesResponse>(
    key,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Nova Poshta city search failed: ${res.status}`);
      return res.json();
    },
    { revalidateOnFocus: false },
  );
}

export interface NovaPoshtaWarehouse {
  name: string;
  ref: string;
  address: string;
  type: "warehouse" | "postomat";
  number?: number;
}

export interface NovaPoshtaWarehousesResponse {
  warehouses: NovaPoshtaWarehouse[];
  error?: string;
}

export function useNovaPoshtaWarehouses(cityRef: string | null, query: string) {
  const trimmedQuery = query.trim();
  const queryParam =
    trimmedQuery.length >= 3 ? `&q=${encodeURIComponent(trimmedQuery)}` : "";
  const key = cityRef
    ? `/np-warehouses?cityRef=${encodeURIComponent(cityRef)}${queryParam}`
    : null;
  return useSWR<NovaPoshtaWarehousesResponse>(
    key,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Nova Poshta warehouse search failed: ${res.status}`);
      return res.json();
    },
    { revalidateOnFocus: false },
  );
}

export interface DeliveryWarehouseOption {
  name: string;
  address: string;
  ref?: string;
}

export function useDeliveryWarehouses(city: string, deliveryMethod: string) {
  const trimmed = city.trim();
  const enabled = Boolean(trimmed) && (deliveryMethod === "nova_poshta" || deliveryMethod === "ukrposhta");
  const slug = deliveryMethod === "nova_poshta" ? "nova-poshta" : deliveryMethod;
  const key = enabled ? `/delivery/${slug}-warehouses?city=${encodeURIComponent(trimmed)}` : null;
  return useApiGet<{ data: DeliveryWarehouseOption[] }>(
    key,
    () =>
      apiCall<{ data: DeliveryWarehouseOption[] }>(
        `${ORDERS_API_URL}/delivery/${slug}-warehouses/`,
        { method: "POST", body: JSON.stringify({ city_name: trimmed }) },
      ),
    { keepPreviousData: false },
  );
}

export function useNotifications(userId: string | undefined) {
  const listKey = userId ? `/notifications?userId=${userId}&limit=50` : null;
  const unreadKey = userId ? `/notifications/unread/${userId}` : null;
  const { mutate: globalMutate, cache } = useSWRConfig();

  const { data: notifications, isLoading } = useApiGet<NotificationListResponse>(
    listKey,
    () => notificationsApi.list(userId!, 1, 50),
  );
  const { data: unreadData } = useApiGet<{ count: number }>(
    unreadKey,
    () => notificationsApi.unreadCount(userId!),
  );

  // Boolean (not the list object) so SSE pushes that update `notifications`
  // don't re-run the effect below and re-create the EventSource on each event.
  const listLoaded = useMemo(() => notifications !== undefined, [notifications]);

  useEffect(() => {
    if (!userId || !listLoaded) return;
    return createNotificationSSE(userId, (item) => {
      if (!listKey || !unreadKey) return;
      // Dedup by id: a re-established connection may re-send an event we already
      // have. Skip both the list push and the unread bump for duplicates.
      const list = cache.get(listKey)?.data as NotificationListResponse | undefined;
      if (list?.items.some((n) => n.id === item.id)) return;
      globalMutate(
        listKey,
        (prev?: NotificationListResponse) =>
          prev ? { ...prev, items: [item, ...prev.items], total: prev.total + 1 } : prev,
        { revalidate: false }
      );
      globalMutate(
        unreadKey,
        (prev?: { count: number }) => ({ count: (prev?.count ?? 0) + 1 }),
        { revalidate: false }
      );
    });
  }, [userId, listLoaded, listKey, unreadKey, globalMutate, cache]);

  const markAsRead = useCallback(async (id: string) => {
    if (!listKey || !unreadKey) return;
    const res = await notificationsApi.markRead(id);
    if (!res.data) return;
    globalMutate(
      listKey,
      (prev?: NotificationListResponse) =>
        prev
          ? { ...prev, items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }
          : prev,
      { revalidate: false }
    );
    globalMutate(
      unreadKey,
      (prev?: { count: number }) => ({ count: Math.max(0, (prev?.count ?? 0) - 1) }),
      { revalidate: false }
    );
  }, [globalMutate, listKey, unreadKey]);

  const markAllAsRead = useCallback(async () => {
    if (!userId || !listKey || !unreadKey) return;
    const res = await notificationsApi.markAllRead(userId);
    if (!res.data) return;
    globalMutate(
      listKey,
      (prev?: NotificationListResponse) =>
        prev ? { ...prev, items: prev.items.map((n) => ({ ...n, read: true })) } : prev,
      { revalidate: false }
    );
    globalMutate(unreadKey, () => ({ count: 0 }), { revalidate: false });
  }, [globalMutate, listKey, unreadKey, userId]);

  const dismiss = useCallback(async (id: string) => {
    if (!listKey || !unreadKey) return;
    const res = await notificationsApi.dismiss(id);
    if (!res.data) return;
    const current = cache.get(listKey)?.data as NotificationListResponse | undefined;
    const target = current?.items.find((n) => n.id === id);
    const wasUnread = Boolean(target && !target.read);
    globalMutate(
      listKey,
      (prev?: NotificationListResponse) =>
        prev ? { ...prev, items: prev.items.filter((n) => n.id !== id) } : prev,
      { revalidate: false }
    );
    if (wasUnread) {
      globalMutate(
        unreadKey,
        (prev?: { count: number }) => ({ count: Math.max(0, (prev?.count ?? 0) - 1) }),
        { revalidate: false }
      );
    }
  }, [cache, globalMutate, listKey, unreadKey]);

  const clearAll = useCallback(async () => {
    if (!userId || !listKey || !unreadKey) return;
    const res = await notificationsApi.clearAll(userId);
    if (!res.data) return;
    globalMutate(
      listKey,
      (prev?: NotificationListResponse) => ({ items: [], total: 0, page: 1, limit: prev?.limit ?? 50 }),
      { revalidate: false }
    );
    globalMutate(unreadKey, () => ({ count: 0 }), { revalidate: false });
  }, [globalMutate, listKey, unreadKey, userId]);

  return {
    notifications: notifications?.items ?? [],
    unreadCount: unreadData?.count ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  };
}
