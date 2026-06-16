// Stale-while-revalidate query hook for the admin area.
// Returns cached data instantly (localStorage + memory via lib/cache),
// then refreshes in the background — eliminating empty/flashing states.

import { useCallback, useEffect, useRef, useState } from "react";
import { getCached, setCached } from "@/lib/cache";

const TTL = 24 * 60 * 60 * 1000; // long TTL — we always revalidate in background

export type CachedQuery<T> = {
  /** Latest data (cached immediately, then fresh). */
  data: T | null;
  /** True only when there is no cached data yet (first ever visit). */
  loading: boolean;
  /** True while a background refresh is in flight. */
  refreshing: boolean;
  /** Force a refetch (also persists the fresh result to cache). */
  refresh: () => Promise<void>;
  /** Optimistically update data + cache without a refetch. */
  setData: (updater: T | ((prev: T | null) => T)) => void;
};

export function useCachedQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): CachedQuery<T> {
  const k = key ? `admq:${key}` : null;
  const [data, setDataState] = useState<T | null>(() => (k ? getCached<T>(k) : null));
  const [loading, setLoading] = useState<boolean>(() => !(k && getCached<T>(k) !== null));
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(k);

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState((prev) => {
      const next =
        typeof updater === "function" ? (updater as (p: T | null) => T)(prev) : updater;
      if (keyRef.current && next !== null && next !== undefined) {
        setCached(keyRef.current, next, TTL);
      }
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const kk = keyRef.current;
    if (!kk) return;
    setRefreshing(true);
    try {
      const fresh = await fetcherRef.current();
      if (keyRef.current !== kk) return; // key changed mid-flight
      if (fresh !== undefined && fresh !== null) {
        setCached(kk, fresh, TTL);
        setDataState(fresh);
      }
    } catch {
      /* keep stale data on failure */
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    keyRef.current = k;
    if (!k) return;
    const hit = getCached<T>(k);
    if (hit !== null) {
      setDataState(hit);
      setLoading(false);
    } else {
      setDataState(null);
      setLoading(true);
    }
    void refresh();
  }, [k, refresh]);

  return { data, loading, refreshing, refresh, setData };
}
