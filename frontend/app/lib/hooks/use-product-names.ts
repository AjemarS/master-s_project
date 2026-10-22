import { productApi } from "~/lib/api/admin-api";
import { useApiGet } from "~/lib/hooks/use-api";

/** One batched lookup for the product names inventory-service does not know */
export function useProductNames(ids: number[]) {
  const sorted = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
  const { data } = useApiGet(sorted.length ? `/products?ids=${sorted.join(",")}` : null, () =>
    productApi.getAll({ ids: sorted.join(","), pageSize: 100 })
  );
  return (id: number) => data?.results.find((p) => p.id === id)?.name ?? `#${id}`;
}
