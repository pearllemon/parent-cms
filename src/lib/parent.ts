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
export async function trackPageView(path: string) {
  try {
    const site_id = await getSiteId();
    if (!site_id) return;
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
    }
    // Fire-and-forget; swallow non-2xx silently so parent FK hiccups don't
    // surface in the runtime overlay.
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
    if (!res.ok) {
      // consume body, stay quiet
      await res.text().catch(() => "");
    }
  } catch {
    /* noop */
  }
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
};

export type PostsResponse = {
  posts: ParentPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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
  return cachedFetch<PostsResponse | null>(
    `posts::${url}`,
    async () => {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) return null;
      return res.json();
    },
    5 * 60 * 1000, // 5 min
  );
}

export async function fetchPostBySlug(slug: string): Promise<ParentPost | null> {
  const data = await fetchPosts({ slug });
  if (!data) return null;
  // API may return { post } or { posts: [..] }
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
