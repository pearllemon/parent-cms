// Pearl Lemon parent-site connector.
// Resolves the *real* site row by domain (heartbeat IDs are unstable),
// caches the full config, and exposes lead/page-view helpers.
import { createClient } from "@supabase/supabase-js";
import { cachedFetch } from "./cache";

export const SUPABASE_URL = "https://zvaiqrewtqvsokzbxnxt.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2YWlxcmV3dHF2c29remJ4bnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDcwNDQsImV4cCI6MjA5MTEyMzA0NH0.1EJJiOnH51FzKuAtU8QTpmu2GgZCgX1FjaLpHTtdl-k";

export const API = `${SUPABASE_URL}/functions/v1/site-config`;
const HEADERS = { apikey: SUPABASE_ANON_KEY } as const;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, storageKey: "pl-child-auth" },
});

// ----- Types (loose — parent evolves) ---------------------------------------
export type SiteConfig = {
  site: { id: string; name: string; domain: string; status: string } & Record<string, unknown>;
  headerConfig: Record<string, unknown> | null;
  footerConfig: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
  errorPageConfig: Record<string, unknown> | null;
  popupConfig: Record<string, unknown> | null;
  services: unknown[];
  caseStudies: unknown[];
  teamMembers: unknown[];
  bookingPage: unknown;
  blogTemplate: unknown;
  seoConfig: { meta_title?: string; meta_description?: string; canonical_url?: string } | null;
  customCode: { head: { code: string }[]; body: { code: string }[]; footer: { code: string }[] };
  dynamicSections: Record<string, unknown>;
  widgets: { whatsapp?: { phone: string; welcomeMessage?: string; position?: string } | null; crisp?: { websiteId: string } | null };
  totalPageViews?: number;
  postsCount?: number;
} & Record<string, unknown>;

// ----- Site resolution -------------------------------------------------------
let configPromise: Promise<SiteConfig | null> | null = null;

function getDomain(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

async function fetchConfigByDomain(): Promise<SiteConfig | null> {
  const domain = getDomain();
  if (!domain) return null;
  try {
    // Heartbeat ensures the row exists (auto-registers if missing).
    await fetch(`${API}?action=heartbeat&domain=${encodeURIComponent(domain)}`, {
      headers: HEADERS,
    }).catch(() => null);

    const res = await fetch(`${API}?domain=${encodeURIComponent(domain)}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteConfig;
    if (!data?.site?.id) return null;
    (window as unknown as { __PL_SITE_ID?: string }).__PL_SITE_ID = data.site.id;
    return data;
  } catch {
    return null;
  }
}

export function getSiteConfig(force = false): Promise<SiteConfig | null> {
  if (force) configPromise = null;
  if (configPromise) return configPromise;
  if (typeof window === "undefined") return Promise.resolve(null);

  // sessionStorage cache (1h)
  try {
    const raw = sessionStorage.getItem("pl_config");
    const ts = Number(sessionStorage.getItem("pl_config_ts") || 0);
    if (raw && ts && Date.now() - ts < 60 * 60 * 1000) {
      const cached = JSON.parse(raw) as SiteConfig;
      configPromise = Promise.resolve(cached);
      // refresh in background
      fetchConfigByDomain().then((fresh) => {
        if (fresh) {
          sessionStorage.setItem("pl_config", JSON.stringify(fresh));
          sessionStorage.setItem("pl_config_ts", String(Date.now()));
        }
      });
      return configPromise;
    }
  } catch {
    /* ignore */
  }

  configPromise = fetchConfigByDomain().then((cfg) => {
    if (cfg) {
      try {
        sessionStorage.setItem("pl_config", JSON.stringify(cfg));
        sessionStorage.setItem("pl_config_ts", String(Date.now()));
      } catch {
        /* quota */
      }
    }
    return cfg;
  });
  return configPromise;
}

export async function getSiteId(): Promise<string | null> {
  const cfg = await getSiteConfig();
  return cfg?.site?.id ?? null;
}

// ----- Page view tracking ----------------------------------------------------
// Tracks to BOTH the parent CMS (so cross-site analytics aggregate) and the
// child Lovable Cloud page_view_events table (so the dashboard has a live,
// realtime-subscribable counter that doesn't depend on parent latency).
export async function trackPageView(path: string) {
  let sessionId: string;
  try {
    sessionId = sessionStorage.getItem("session_id") || crypto.randomUUID();
    sessionStorage.setItem("session_id", sessionId);
  } catch { sessionId = crypto.randomUUID(); }

  // Child-side counter (best-effort, fire and forget)
  try {
    const { supabase: cloud } = await import("@/integrations/supabase/client");
    void (cloud.from("page_view_events" as any) as any).insert({
      path,
      session_id: sessionId,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });
  } catch { /* ignore */ }

  // Parent CMS
  try {
    const site_id = await getSiteId();
    if (!site_id) return;
    const res = await fetch(`${API}?action=page_view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({
        site_id,
        page_path: path,
        referrer: document.referrer,
        session_id: sessionId,
        user_agent: navigator.userAgent,
      }),
      keepalive: true,
    });
    if (!res.ok) await res.text().catch(() => "");
  } catch { /* noop */ }
}

// ----- Lead submission -------------------------------------------------------
export async function submitLead(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  const site_id = await getSiteId();
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ ...input, source_site_id: site_id }),
  });
  if (!res.ok) throw new Error(`Lead submission failed (${res.status})`);
  return res.json().catch(() => ({}));
}

// ----- Schema / manifest -----------------------------------------------------
export type Schema = {
  version: string;
  tables: string[];
  total_tables: number;
  endpoints: Record<string, { method: string; params?: string; description?: string }>;
  features: string[];
};

export async function getSchema(): Promise<Schema | null> {
  try {
    const cached = localStorage.getItem("pl_schema");
    const ts = Number(localStorage.getItem("pl_schema_ts") || 0);
    if (cached && Date.now() - ts < 60 * 60 * 1000) return JSON.parse(cached);
    const res = await fetch(`${API}?action=schema`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("pl_schema", JSON.stringify(data));
    localStorage.setItem("pl_schema_ts", String(Date.now()));
    return data;
  } catch {
    return null;
  }
}

// ----- Posts (live from parent — single source of truth) --------------------
export type ParentPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  content?: string;
  featured_image_url?: string;
  author?: string | { name?: string };
  published_at?: string;
  publish_date?: string;
  status?: string;
  type?: "post" | "page" | string;
  categories?: { slug: string; name: string }[];
  tags?: { slug: string; name: string }[];
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  elementor_data?: unknown;
  render_mode?: string;
};

export type PostsResponse = {
  posts: ParentPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Map an imported_posts row (Lovable Cloud) to the ParentPost shape so the
// same Blog/BlogPost templates can render it.
function mapImportedToParent(row: any): ParentPost {
  const raw = row?.raw || {};
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || "",
    body: row.body || "",
    content: row.body || "",
    featured_image_url: row.featured_image_url || undefined,
    author: raw.author || undefined,
    published_at: row.publish_date || undefined,
    publish_date: row.publish_date || undefined,
    status: row.status,
    type: (row.type as ParentPost["type"]) || "post",
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    meta_title: row.meta_title || undefined,
    meta_description: row.meta_description || undefined,
    canonical_url: row.canonical_url || undefined,
    elementor_data: row.elementor_data || undefined,
    render_mode: row.render_mode || undefined,
  };
}

async function fetchImportedPosts(opts: {
  slug?: string;
  type?: string;
  category?: string;
  tag?: string;
  publishedOnly?: boolean;
}): Promise<ParentPost[]> {
  try {
    const { supabase: cloud } = await import("@/integrations/supabase/client");
    // Imported content is shared across all users and dashboards (WordPress-style),
    // so we intentionally do NOT filter by site_id here.
    let q = cloud.from("imported_posts").select("*");
    if (opts.slug) q = q.eq("slug", opts.slug);
    if (opts.type) q = q.eq("type", opts.type);
    if (opts.publishedOnly) q = q.eq("status", "published");
    q = q.order("publish_date", { ascending: false }).limit(1000);
    const { data, error } = await q;
    if (error) {
      console.warn("imported_posts fetch failed:", error.message);
      return [];
    }
    let mapped = (data || []).map(mapImportedToParent);
    if (opts.category)
      mapped = mapped.filter((p) =>
        p.categories?.some((c) => c.slug === opts.category),
      );
    if (opts.tag)
      mapped = mapped.filter((p) => p.tags?.some((t) => t.slug === opts.tag));
    return mapped;
  } catch {
    return [];
  }
}

export async function fetchPosts(opts: { page?: number; limit?: number; slug?: string; type?: string; category?: string; tag?: string } = {}): Promise<PostsResponse | null> {
  const site_id = await getSiteId();
  if (!site_id) return null;
  const params = new URLSearchParams({ action: "posts", site_id });
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.slug) params.set("slug", opts.slug);
  if (opts.type) params.set("type", opts.type);
  if (opts.category) params.set("category", opts.category);
  if (opts.tag) params.set("tag", opts.tag);
  const url = `${API}?${params.toString()}`;

  const parentRes = await cachedFetch<PostsResponse | null>(
    `posts::${url}`,
    async () => {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) return null;
      return res.json();
    },
    5 * 60 * 1000, // 5 min
  );

  // Always merge in imported (Lovable Cloud) posts so they appear on the site
  const imported = await fetchImportedPosts({
    slug: opts.slug,
    type: opts.type,
    category: opts.category,
    tag: opts.tag,
    publishedOnly: !opts.slug, // when looking up a single slug, allow drafts too
  });

  const parentPosts = parentRes?.posts || [];
  // Dedupe by slug+type, parent wins
  const seen = new Set<string>();
  const merged: ParentPost[] = [];
  for (const p of [...parentPosts, ...imported]) {
    const key = `${p.type || "post"}::${p.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }
  // Sort newest first
  merged.sort((a, b) => {
    const da = new Date(a.published_at || a.publish_date || 0).getTime();
    const db = new Date(b.published_at || b.publish_date || 0).getTime();
    return db - da;
  });

  const limit = opts.limit ?? merged.length;
  const page = opts.page ?? 1;
  const start = (page - 1) * limit;
  const paged = opts.limit ? merged.slice(start, start + limit) : merged;

  return {
    posts: paged,
    total: merged.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(merged.length / Math.max(1, limit))),
  };
}

export async function fetchPostBySlug(slug: string): Promise<ParentPost | null> {
  const data = await fetchPosts({ slug });
  if (!data) {
    // Last-chance: pull directly from imported_posts
    const imp = await fetchImportedPosts({ slug });
    return imp[0] || null;
  }
  const maybe = data as unknown as { post?: ParentPost; posts?: ParentPost[] };
  if (maybe.post) return maybe.post;
  if (maybe.posts?.length) return maybe.posts[0];
  return null;
}

export async function fetchTaxonomies(): Promise<{ categories: { slug: string; name: string; count?: number }[]; tags: { slug: string; name: string; count?: number }[] } | null> {
  const site_id = await getSiteId();
  if (!site_id) return null;
  const url = `${API}?action=taxonomies&site_id=${site_id}`;
  return cachedFetch(
    `tax::${url}`,
    async () => {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) return null;
      return res.json();
    },
    15 * 60 * 1000,
  );
}

/* -------------------------------------------------------------------------- */
/* Extended parent API helpers (analytics, versions, overrides, events, bulk) */
/* -------------------------------------------------------------------------- */

async function postJSON(action: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${action} failed (${res.status})`);
  return res.json().catch(() => ({}));
}

async function getJSON<T = unknown>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T | null> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${API}?action=${action}${qs ? `&${qs}` : ""}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type AnalyticsResponse = {
  totalViews?: number;
  uniqueVisitors?: number;
  daily?: { date: string; views: number; visitors?: number }[];
  topPages?: { path: string; views: number }[];
};

export async function fetchAnalytics(days = 30): Promise<AnalyticsResponse | null> {
  const site_id = await getSiteId();
  if (!site_id) return null;
  return getJSON<AnalyticsResponse>("analytics", { site_id, days });
}

export async function fetchVersions(config_type: string, config_id: string) {
  return getJSON<{ versions: { id: string; created_at: string; change_summary?: string; config_snapshot: unknown }[] }>(
    "versions",
    { config_type, config_id },
  );
}

export type SiteOverride = {
  id?: string;
  config_type: string;
  override_key: string;
  override_value: unknown;
  updated_at?: string;
};

// Some parent deployments don't yet have the site_overrides table.
// First 500 / missing-table error flips this flag so we stop calling
// the endpoint (avoids spamming the runtime-error overlay).
const OVERRIDES_DISABLED_KEY = "pl_overrides_disabled";
const isOverridesDisabled = () => {
  try { return sessionStorage.getItem(OVERRIDES_DISABLED_KEY) === "1"; } catch { return false; }
};
const disableOverrides = () => {
  try { sessionStorage.setItem(OVERRIDES_DISABLED_KEY, "1"); } catch { /* ignore */ }
};

export async function fetchOverrides(): Promise<SiteOverride[]> {
  if (isOverridesDisabled()) return [];
  const site_id = await getSiteId();
  if (!site_id) return [];
  try {
    const url = `${API}?action=overrides&site_id=${encodeURIComponent(site_id)}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      // Drain body, mark feature unsupported on this parent, return empty.
      const txt = await res.text().catch(() => "");
      if (res.status >= 500 || /site_overrides/i.test(txt)) disableOverrides();
      return [];
    }
    const data = (await res.json()) as { overrides?: SiteOverride[] } | SiteOverride[];
    return Array.isArray(data) ? data : (data.overrides || []);
  } catch {
    return [];
  }
}

export async function saveOverride(o: Omit<SiteOverride, "id" | "updated_at">) {
  if (isOverridesDisabled()) {
    throw new Error("Overrides are not enabled on the parent platform yet.");
  }
  const site_id = await getSiteId();
  if (!site_id) throw new Error("No site_id");
  try {
    return await postJSON("save_override", { site_id, ...o });
  } catch (e) {
    disableOverrides();
    throw e;
  }
}

export async function fetchSiteUsers() {
  const site_id = await getSiteId();
  if (!site_id) return [];
  const data = await getJSON<{ users?: unknown[] } | unknown[]>("site_users", { site_id });
  return Array.isArray(data) ? data : ((data as { users?: unknown[] })?.users || []);
}

export async function trackPopupEvent(popup_id: string, event_type: "impression" | "click" | "dismiss") {
  const site_id = await getSiteId();
  if (!site_id) return;
  try { await postJSON("popup_event", { popup_id, site_id, event_type }); } catch { /* silent */ }
}

export async function trackInteraction(interaction_type: string, source: string, extra: Record<string, unknown> = {}) {
  const site_id = await getSiteId();
  if (!site_id) return;
  try { await postJSON("track_interaction", { site_id, interaction_type, source, ...extra }); } catch { /* silent */ }
}

export async function bulkOperation(input: {
  operation_type: "publish" | "assign_component" | "update_status" | "delete";
  target_type: "posts" | "sites";
  target_ids: string[];
  payload?: Record<string, unknown>;
}) {
  return postJSON("bulk", input);
}

export async function saveConfigVersion(input: {
  config_type: string;
  config_id: string;
  config_snapshot: unknown;
  change_summary?: string;
}) {
  return postJSON("save_version", input);
}

/** Quick parent connection health probe. */
export async function pingParent(): Promise<{ ok: boolean; latencyMs: number; status?: number }> {
  const start = performance.now();
  try {
    const res = await fetch(`${API}?action=schema`, { headers: HEADERS });
    return { ok: res.ok, status: res.status, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}
