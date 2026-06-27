import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";
import type { ApiResponse } from "~/lib/api/client";

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data!;
}

export function useApiGet<T>(
  key: string | null,
  fetcher: () => Promise<ApiResponse<T>>,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(key, async () => unwrap(await fetcher()), { keepPreviousData: true, ...config });
}

export function useApiMutation<T, P = void>(
  key: string,
  mutation: (params: P) => Promise<ApiResponse<T>>,
  options?: SWRMutationConfiguration<T, Error, string, P>
) {
  const { mutate: globalMutate } = useSWRConfig();
  return useSWRMutation<T, Error, string, P>(
    key,
    async (_, { arg }: { arg: P }) => unwrap(await mutation(arg)),
    {
      ...options,
      onSuccess: (data, key, config) => {
        globalMutate((k: string) => typeof k === "string" && k.startsWith(key.split("?")[0]));
        options?.onSuccess?.(data, key, config);
      },
    }
  );
}
