// §16 — DynamicRouter
// Catch-all route component that asks the parent CMS for the dynamic page
// definition at this path and switches on the returned `type`.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { API, SUPABASE_ANON_KEY, getSiteId } from "@/lib/parent";
import ThemeBlocksRenderer from "./ThemeBlocksRenderer";

type DynamicPage = {
  type:
    | "blog_magazine" | "blog_post" | "case_study" | "service_detail"
    | "services_grid" | "landing_page" | "custom"
    | "author" | "tag" | "category" | "search" | "404";
  blueprint_id?: string;
  data?: Record<string, unknown>;
  blocks?: unknown[];
  seo?: { title?: string; description?: string };
};

export default function DynamicRouter() {
  const { pathname } = useLocation();
  const [page, setPage] = useState<DynamicPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const site_id = await getSiteId();
        if (!site_id) return;
        const url = `${API}?action=dynamic_page&site_id=${encodeURIComponent(site_id)}&path=${encodeURIComponent(pathname)}`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
        if (!res.ok) { if (alive) setPage(null); return; }
        const data = (await res.json()) as DynamicPage;
        if (alive) setPage(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    if (page?.seo?.title) document.title = page.seo.title;
  }, [page]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!page) return null;

  // All built-in page types currently flow through the block renderer.
  // Specific React templates (BlogPost, ServiceDetail, …) can subscribe by
  // switching on `page.type` here later.
  return <ThemeBlocksRenderer blocks={page.blocks || []} />;
}
