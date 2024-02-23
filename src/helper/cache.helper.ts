import { CacheService } from "~src/service/cache/cache.service";

type CachedGetterOptions = {
  returnOnCacheError: boolean;
};

export const cachedGetter =
  (cacheService: CacheService, options?: CachedGetterOptions) =>
  async <TData>(
    getFn: () => Promise<ErrorXOR<TData>>,
    namespace: string,
    key: string,
    expiresInMilliseconds: number | null
  ): Promise<ErrorXOR<TData>> => {
    const [cachedDataErr, cachedData] = await cacheService.get<TData>(namespace, key);
    if (cachedDataErr) {
      if (options?.returnOnCacheError) {
        return [cachedDataErr, null];
      }
    }

    if (cachedData) {
      return [null, cachedData];
    }

    const [dataErr, data] = await getFn();
    if (dataErr) {
      return [dataErr, null];
    }

    const [setErr] = await cacheService.set<TData>(namespace, key, data, expiresInMilliseconds);
    if (setErr) {
      if (options?.returnOnCacheError) {
        return [setErr, null];
      }
    }

    return [null, data];
  };
