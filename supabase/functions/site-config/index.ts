import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function authUid(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data } = await sb.auth.getClaims(token);
  return (data?.claims?.sub as string | undefined) || null;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

const uid = () => crypto.randomUUID();
const cleanPath = (p: string | null) => {
  const x = (p || "/").trim() || "/";
  return x.startsWith("/") ? x : `/${x}`;
};
const slugFromPath = (path: string) => path.split("/").filter(Boolean).pop() || "home";
const titleize = (s: string) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function composeLocal(content: string, format: string) {
  const raw = format === "html" ? content.replace(/<[^>]+>/g, " ") : content;
  const lines = raw.split(/\r?\n/);
  const children: any[] = [];
  const outline: any[] = [];
  let para: string[] = [];
  const flush = () => {
    const text = para.join(" ").trim();
    if (text) children.push({ id: uid(), type: "text", props: { text, fontSize: 18, lineHeight: 1.7, color: "#334155" } });
    para = [];
  };
  for (const line of lines) {
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length;
      const text = h[2].trim();
      outline.push({ level, text });
      children.push({ id: uid(), type: "heading", props: { level, text, fontSize: level === 1 ? 48 : 32, color: "#0f172a", fontWeight: 800 } });
    } else if (!line.trim()) flush();
    else para.push(line.trim());
  }
  flush();
  const title = outline.find((o) => o.level === 1)?.text || lines.find((l) => l.trim())?.slice(0, 80) || "Untitled";
  const desc = String(children.find((b) => b.type === "text")?.props?.text || "").slice(0, 160);
  const blocks = [{ id: uid(), type: "section", props: { padding: "72px 24px", background: "#ffffff" }, children: [
    { id: uid(), type: "container", props: { maxWidth: "860px", display: "flex", direction: "column", gap: "20px" }, children },
  ] }];
  return {
    blocks,
    seo: { title, desc, og: title },
    outline,
    suggested_images: [],
    toc: outline.map((o) => ({ ...o, anchor: String(o.text).toLowerCase().replace(/[^a-z0-9]+/g, "-") })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "config";
  const sb = admin();

  try {
    if (req.method === "GET" && action === "dynamic_page") {
      const path = cleanPath(url.searchParams.get("path"));
      const slug = slugFromPath(path);
      const { data: blockPage } = await sb.from("page_blocks").select("*").eq("path", path).maybeSingle();
      if (blockPage) return json({ type: blockPage.target || "landing_page", blueprint_id: blockPage.id, data: {}, blocks: blockPage.blocks || [], seo: blockPage.seo || {} });

      if (path === "/blog") {
        const { data: posts } = await sb.from("cpt_entries").select("id,title,slug,data,published_at,updated_at").eq("cpt_slug", "post").eq("status", "published").order("published_at", { ascending: false }).limit(24);
        return json({ type: "blog_magazine", data: { posts: posts || [] }, blocks: [], seo: { title: "Blog", description: "Latest articles" } });
      }
      if (path.startsWith("/blog/")) {
        const { data: post } = await sb.from("cpt_entries").select("*").eq("cpt_slug", "post").eq("slug", slug).eq("status", "published").maybeSingle();
        if (post) return json({ type: "blog_post", data: post, blocks: (post.data as any)?.blocks || [], seo: (post.data as any)?.seo || { title: post.title } });
      }
      if (path === "/services") {
        const { data: services } = await sb.from("cpt_entries").select("*").eq("cpt_slug", "service").eq("status", "published").order("title").limit(100);
        return json({ type: "services_grid", data: { services: services || [] }, blocks: [], seo: { title: "Services" } });
      }
      if (path.startsWith("/services/")) {
        const { data: service } = await sb.from("cpt_entries").select("*").eq("cpt_slug", "service").eq("slug", slug).eq("status", "published").maybeSingle();
        if (service) return json({ type: "service_detail", data: service, blocks: (service.data as any)?.blocks || [], seo: (service.data as any)?.seo || { title: service.title } });
      }
      const { data: page } = await sb.from("cpt_entries").select("*").eq("cpt_slug", "page").eq("slug", slug === "home" ? "home" : slug).eq("status", "published").maybeSingle();
      if (page) return json({ type: "landing_page", data: page, blocks: (page.data as any)?.blocks || [], seo: (page.data as any)?.seo || { title: page.title } });
      return json({ type: "404", data: { path }, blocks: [], seo: { title: "Not found" } });
    }

    if (req.method === "POST" && action === "auto_compose") {
      const body = await req.json().catch(() => ({}));
      const target = String(body.target || "page");
      const content = String(body.content || "");
      if (!content.trim()) return json({ error: "content required" }, 400);
      const result = composeLocal(content, String(body.format || "markdown"));
      const slug = String(result.seo.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `page-${Date.now()}`;
      const path = target === "post" ? `/blog/${slug}` : target === "service" ? `/services/${slug}` : `/${slug}`;
      const site_id = body.site_id || null;
      const up = await sb.from("page_blocks").upsert({ site_id, path, target, blocks: result.blocks, seo: result.seo, source: "auto_compose" }, { onConflict: "site_id,path" }).select("id").maybeSingle();
      if (up.data?.id) await sb.from("page_block_versions").insert({ page_block_id: up.data.id, site_id, path, target, blocks: result.blocks, seo: result.seo, outline: result.outline });
      return json({ post_id: up.data?.id || null, ...result });
    }

    if (req.method === "POST" && action === "overlay_patch") {
      const uid = await authUid(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => ({}));
      if (!body.fp || !body.patch) return json({ error: "fp and patch required" }, 400);
      await sb.from("orphan_edits").insert({ site_id: body.site_id || null, fp: String(body.fp), path: body.path || null, patch: body.patch, status: "pending" });
      return json({ ok: true });
    }

    if (req.method === "GET" && action === "overlay_js") {
      const js = `(() => { if (!new URL(location.href).searchParams.has('pl_edit')) return; const bar=document.createElement('div'); bar.style.cssText='position:fixed;z-index:2147483647;top:12px;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:8px 12px;border-radius:8px;font:13px system-ui;box-shadow:0 8px 28px #0004'; bar.textContent='Parent CMS overlay active'; document.body.appendChild(bar); document.querySelectorAll('[data-pl-fp]').forEach((el)=>{ el.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); el.style.outline='2px solid #2563eb'; }, true); }); })();`;
      return new Response(js, { headers: { ...corsHeaders, "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    }

    if (req.method === "GET" && action === "forms") {
      const { data } = await sb.from("form_definitions").select("*").order("updated_at", { ascending: false });
      return json({ forms: data || [] });
    }

    if (req.method === "POST" && action === "form_submit") {
      const body = await req.json().catch(() => ({}));
      const formId = body.form_id || body.form_slug;
      const data = body.data || body.values || {};
      if (!formId || typeof data !== "object") return json({ error: "form_id and data required" }, 400);
      await sb.from("leads").insert({
        name: String(data.name || data.full_name || "Website lead").slice(0, 200),
        email: String(data.email || "lead@example.com").slice(0, 320),
        phone: data.phone ? String(data.phone).slice(0, 80) : null,
        message: data.message ? String(data.message).slice(0, 5000) : null,
        source: "parentcms-form",
        source_url: body.source_url || null,
        metadata: { form_id: formId, values: data, site_id: body.site_id || null },
      });
      return json({ ok: true });
    }

    if (req.method === "GET" && action === "library") {
      const kind = url.searchParams.get("kind");
      let q = sb.from("cloud_components").select("*").eq("is_published", true).eq("recalled", false).eq("status", "approved").order("updated_at", { ascending: false });
      if (kind) q = q.eq("kind", kind);
      const { data } = await q;
      return json({ items: data || [] });
    }

    if (req.method === "GET" && action === "asset") {
      const id = url.searchParams.get("id");
      const kind = url.searchParams.get("kind");
      if (!id || !kind) return json({ error: "kind and id required" }, 400);
      const { data } = await sb.from("cloud_components").select("*").eq("id", id).eq("kind", kind).maybeSingle();
      return data ? json(data) : json({ error: "not found" }, 404);
    }

    if (req.method === "GET" && action === "preview") {
      const id = url.searchParams.get("id");
      const kind = url.searchParams.get("kind");
      if (!id || !kind) return json({ error: "kind and id required" }, 400);
      const { data } = await sb.from("cloud_components").select("name,version,kind,payload").eq("id", id).eq("kind", kind).maybeSingle();
      const html = `<!doctype html><meta charset="utf-8"><title>${data?.name || "Preview"}</title><body style="font-family:system-ui;padding:24px"><h1>${data?.name || "Preview"}</h1><pre>${JSON.stringify(data?.payload || {}, null, 2).replace(/</g, "&lt;")}</pre></body>`;
      return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }

    if (req.method === "POST" && action === "publish_asset") {
      const uid = await authUid(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => ({}));
      const { site_id, kind, slug, name, description, category, payload, preview_url, thumbnail_url, visibility, scope } = body;
      if (!kind || !slug || !name) return json({ error: "kind, slug, name required" }, 400);
      const { data: latest } = await sb.from("cloud_components").select("version").eq("kind", kind).eq("slug", slug).order("version", { ascending: false }).limit(1).maybeSingle();
      const isChildSubmission = !!site_id;
      const status = isChildSubmission ? "pending_review" : "approved";
      const { data, error } = await sb.from("cloud_components").insert({
        kind, slug, name, description: description || null, category: category || null,
        payload: payload || {}, preview_url: preview_url || null, thumbnail_url: thumbnail_url || null,
        visibility: (scope === "private" ? "private" : visibility) || "public",
        publisher_id: uid, publisher_site_id: site_id || null,
        version: ((latest?.version as number) || 0) + 1,
        status, submitted_at: new Date().toISOString(),
        reviewed_at: isChildSubmission ? null : new Date().toISOString(),
        reviewed_by: isChildSubmission ? null : uid,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, asset: data, status });
    }

    if (req.method === "POST" && action === "import_asset") {
      const uid = await authUid(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => ({}));
      const { site_id, kind, id, mode } = body;
      if (!site_id || !kind || !id) return json({ error: "site_id, kind, id required" }, 400);
      const { data: comp } = await sb.from("cloud_components").select("*").eq("id", id).eq("kind", kind).eq("status", "approved").maybeSingle();
      if (!comp) return json({ error: "asset not approved or not found" }, 404);
      const linked = mode !== "fork";
      if (linked) await sb.from("cloud_component_installs").upsert({ site_id, kind, slug: comp.slug, installed_version: comp.version, local_id: null, auto_sync: true, last_synced_at: new Date().toISOString() }, { onConflict: "site_id,kind,slug" });
      return json({ ok: true, mode: linked ? "link" : "fork", asset: comp });
    }

    return json({ ok: true, schema: "site-config", actions: ["dynamic_page", "auto_compose", "overlay_patch", "overlay_js", "forms", "library"] });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});