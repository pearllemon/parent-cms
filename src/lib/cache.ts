// Lightweight client-side cache layer for the parent CMS.
// - JSON cache: localStorage with TTL (per-key)
// - Image cache: Cache Storage API (service-worker-style, persistent)
// - In-memory cache: per-tab dedupe to avoid waterfalls
//
// Everything is keyed by the parent site id implicitly (callers pass full URL/key).

const NS = "pl_cache_v1::";
const IMG_CACHE = "pl-images-v1";
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

type Entry<T> = { v: T; t: number; ttl: number };

const mem = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | null {
  const k = NS + key;
  const m = mem.get(k);
  if (m && Date.now() - m.t < m.ttl) return m.v as T;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    if (Date.now() - e.t >= e.ttl) {
      localStorage.removeItem(k);
      return null;
    }
    mem.set(k, e);
    return e.v;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  const k = NS + key;
  const e: Entry<T> = { v: value, t: Date.now(), ttl: ttlMs };
  mem.set(k, e);
  try {
    localStorage.setItem(k, JSON.stringify(e));
  } catch {
    // quota — drop oldest pl_cache_ entries
    try {
      Object.keys(localStorage)
        .filter((x) => x.startsWith(NS))
        .slice(0, 20)
        .forEach((x) => localStorage.removeItem(x));
      localStorage.setItem(k, JSON.stringify(e));
    } catch {
      /* give up silently */
    }
  }
}

// Dedupe in-flight fetches so concurrent callers share one network request.
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fetcher()
    .then((v) => {
      if (v !== null && v !== undefined) setCached(key, v, ttlMs);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// ----- Image caching via Cache Storage -------------------------------------
export async function getCachedImageUrl(src: string): Promise<string> {
  if (!src || typeof caches === "undefined") return src;
  try {
    const cache = await caches.open(IMG_CACHE);
    const match = await cache.match(src);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) return src;
    // Clone for cache, return blob URL for consumer
    cache.put(src, res.clone()).catch(() => {});
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return src;
  }
}

// ----- Cache stats & clear --------------------------------------------------
export type CacheStats = {
  jsonEntries: number;
  jsonBytes: number;
  imageEntries: number;
};

export async function getCacheStats(): Promise<CacheStats> {
  let jsonEntries = 0;
  let jsonBytes = 0;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(NS)) {
        jsonEntries++;
        jsonBytes += localStorage.getItem(k)?.length || 0;
      }
    }
  } catch {
    /* ignore */
  }
  let imageEntries = 0;
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open(IMG_CACHE);
      const keys = await cache.keys();
      imageEntries = keys.length;
    }
  } catch {
    /* ignore */
  }
  return { jsonEntries, jsonBytes, imageEntries };
}

export async function clearAllCache() {
  // memory
  mem.clear();
  inflight.clear();
  // localStorage JSON cache
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  // sessionStorage parent config cache
  try {
    sessionStorage.removeItem("pl_config");
    sessionStorage.removeItem("pl_config_ts");
  } catch {
    /* ignore */
  }
  // schema cache
  try {
    localStorage.removeItem("pl_schema");
    localStorage.removeItem("pl_schema_ts");
  } catch {
    /* ignore */
  }
  // image cache
  try {
    if (typeof caches !== "undefined") await caches.delete(IMG_CACHE);
  } catch {
    /* ignore */
  }
}
