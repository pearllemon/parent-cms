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

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "config";
  const sb = admin();

  try {
    // 1. Heartbeat - Auto-detect and register child site
    if (action === "heartbeat") {
      const domain = url.searchParams.get("domain") || "";
      if (!domain) return json({ error: "domain parameter required" }, 400);

      const cleanDomain = domain.toLowerCase().trim().replace(/https?:\/\//, "").replace(/\/+$/, "");

      // Check if domain is already registered
      const { data: existing } = await sb
        .from("child_installations")
        .select("*")
        .or(`site_url.ilike.%${cleanDomain}%,site_id.eq.${cleanDomain}`)
        .maybeSingle();

      if (existing) {
        // Update last seen
        await sb
          .from("child_installations")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", existing.id);

        return json({
          registered: true,
          site_id: existing.site_id,
          auto_created: false,
        });
      } else {
        // Auto-register new child site in draft mode
        const newSiteId = `site_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        const newUrl = `https://${cleanDomain}`;
        const newName = cleanDomain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());

        const { data: inserted, error: insertErr } = await sb
          .from("child_installations")
          .insert({
            site_id: newSiteId,
            site_url: newUrl,
            site_name: newName,
            mode: "draft",
            upgrade_state: "unknown",
            last_seen_at: new Date().toISOString(),
            auto_upgrade: true,
          })
          .select()
          .single();

        if (insertErr) {
          return json({ error: "failed to auto-register site: " + insertErr.message }, 500);
        }

        // Log registration in activity log (triggers dashboard alert/notification)
        try {
          await sb.from("activity_log").insert({
            action: "create",
            entity_type: "child_installation",
            entity_id: inserted.id,
            entity_label: newName,
            details: {
              domain: cleanDomain,
              site_id: newSiteId,
              auto_created: true,
              message: `New child site registered automatically: ${newUrl}`
            }
          });
        } catch (e) {
          console.error("Failed to log auto-register activity:", e);
        }

        return json({
          registered: true,
          site_id: newSiteId,
          auto_created: true,
        });
      }
    }

    // 2. Full Site Config (ONE call gets everything)
    if (action === "config" || action === "siteConfig") {
      const siteId = url.searchParams.get("site_id") || "";
      const domainParam = url.searchParams.get("domain") || "";

      let siteRow: any = null;

      if (siteId) {
        const { data } = await sb.from("child_installations").select("*").eq("site_id", siteId).maybeSingle();
        siteRow = data;
      } else if (domainParam) {
        const cleanDomain = domainParam.toLowerCase().trim().replace(/https?:\/\//, "").replace(/\/+$/, "");
        const { data } = await sb.from("child_installations").select("*").or(`site_url.ilike.%${cleanDomain}%,site_id.eq.${cleanDomain}`).maybeSingle();
        siteRow = data;
      }

      // If domain param is provided but not found, auto-register on the fly
      if (!siteRow && domainParam) {
        const cleanDomain = domainParam.toLowerCase().trim().replace(/https?:\/\//, "").replace(/\/+$/, "");
        const newSiteId = `site_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        const newUrl = `https://${cleanDomain}`;
        const newName = cleanDomain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());

        const { data: inserted, error: insertErr } = await sb
          .from("child_installations")
          .insert({
            site_id: newSiteId,
            site_url: newUrl,
            site_name: newName,
            mode: "draft",
            upgrade_state: "unknown",
            last_seen_at: new Date().toISOString(),
            auto_upgrade: true,
          })
          .select()
          .single();

        if (!insertErr && inserted) {
          siteRow = inserted;
          // Log activity
          try {
            await sb.from("activity_log").insert({
              action: "create",
              entity_type: "child_installation",
              entity_id: inserted.id,
              entity_label: newName,
              details: { domain: cleanDomain, site_id: newSiteId, auto_created: true, message: `New child site registered automatically during config fetch: ${newUrl}` }
            });
          } catch (e) {
            console.error("Failed to log activity:", e);
          }
        }
      }

      if (!siteRow) {
        return json({ error: "site not registered and no domain provided for auto-registration" }, 404);
      }

      // Fetch global tokens, header layouts, footer layouts from database
      const { data: themeTokens } = await sb.from("theme_tokens").select("*").limit(1).maybeSingle();
      const { data: headerTpl } = await sb.from("elementor_templates").select("data").eq("source_id", "global-header-layout").maybeSingle();
      const { data: footerTpl } = await sb.from("elementor_templates").select("data").eq("source_id", "global-footer-layout").maybeSingle();

      // Formulate full child site configuration
      const responseConfig = {
        site: {
          id: siteRow.site_id,
          name: siteRow.site_name || "Child site",
          domain: siteRow.site_url ? siteRow.site_url.replace(/https?:\/\//, "") : "",
          status: siteRow.mode || "draft",
        },
        headerConfig: {
          sticky_header: true,
          transparent_mode: false,
          show_progress_bar: true,
          logo_url: headerTpl?.data ? (headerTpl.data as any).find((el: any) => el.id === "global-nav-section")?.elements?.find((el: any) => el.id === "header-logo-column")?.elements?.find((el: any) => el.id === "header-logo-img")?.settings?.image?.url : null,
          data: headerTpl?.data || null,
          theme: {
            top_bar_bg: "0 0% 4%",
            top_bar_text: "0 0% 77%",
            nav_bg: "0 0% 100%",
            nav_text: "0 0% 20%",
            cta_bg: "48 100% 50%",
            cta_text: "0 0% 7%",
            accent_color: "48 100% 50%",
            cta_border_radius: "4px"
          },
          contactSet: {
            email: "info@pearllemongroup.com",
            phones: [
              { id: "1", label: "UK Office", number: "+442071833436" },
              { id: "2", label: "UK Mobile", number: "+4474545439583" },
              { id: "3", label: "US Office", number: "+16502784421" }
            ]
          }
        },
        footerConfig: {
          logo_url: footerTpl?.data ? (footerTpl.data as any).find((el: any) => el.id === "global-footer-section")?.elements?.find((el: any) => el.id === "footer-desc-col")?.elements?.find((el: any) => el.id === "footer-logo")?.settings?.image?.url : null,
          description: "Increase visibility, attract qualified leads, and convert more customers with expert SEO services.",
          copyright_text: `© ${new Date().getFullYear()} Pearl Lemon. All rights reserved.`,
          bg_color: "0 0% 4%",
          text_color: "0 0% 77%",
          accent_color: "48 100% 50%",
          link_color: "0 0% 60%",
          show_form: true,
          form_heading: "Send Us a Message",
          data: footerTpl?.data || null,
          contactSet: {
            email: "info@pearllemongroup.com",
            phones: []
          }
        },
        theme: {
          colors: themeTokens?.colors || {
            primary: "#111111",
            accent: "#ffcc00",
            background: "#ffffff",
            foreground: "#0f172a",
          },
          typography: themeTokens?.typography || {
            fontFamilyHeading: "Inter",
            fontFamilyBody: "Inter",
            baseSize: 16,
            scale: 1.25,
          }
        },
        widgets: {
          crisp: { websiteId: "YOUR_CRISP_WEBSITE_ID" },
          whatsapp: { phone: "+442071833436", welcomeMessage: "Hi, I'd like to get a free SEO audit!", position: "bottom-right" }
        },
        _api: {
          base: `${url.origin}/functions/v1/site-config`,
          posts: `${url.origin}/functions/v1/site-config?action=posts&site_id=${siteRow.site_id}`,
          taxonomies: `${url.origin}/functions/v1/site-config?action=taxonomies&site_id=${siteRow.site_id}`,
          submitLead: `${url.origin}/functions/v1/site-config?action=form_submit`
        }
      };

      return json(responseConfig);
    }

    // 3. Child Posts paginated listing
    if (action === "posts") {
      const siteId = url.searchParams.get("site_id") || "default";
      const slug = url.searchParams.get("slug") || "";
      const type = url.searchParams.get("type") || "";

      let q = sb.from("imported_posts").select("*").eq("site_id", siteId);
      if (slug) q = q.eq("slug", slug);
      if (type) q = q.eq("type", type);
      
      const { data, error } = await q.order("publish_date", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      return json({ posts: data || [], total: data?.length || 0 });
    }

    // 4. Child Taxonomies listing
    if (action === "taxonomies") {
      return json({
        categories: [
          { slug: "seo", name: "SEO" },
          { slug: "marketing", name: "Marketing" }
        ],
        tags: [
          { slug: "tips", name: "Tips" }
        ]
      });
    }

    // 5. Page View tracking
    if (req.method === "POST" && (action === "page_view" || action === "trackPageView")) {
      const body = await req.json().catch(() => ({}));
      const { site_id, page_path, referrer, user_agent } = body;
      
      const { error } = await sb.from("page_view_events").insert({
        site_id: site_id || "default",
        path: page_path || "/",
        referrer: referrer || null,
        user_agent: user_agent || null,
        session_id: body.session_id || crypto.randomUUID()
      });
      
      return json({ ok: !error, error: error?.message });
    }

    // 6. Lead form submissions
    if (req.method === "POST" && (action === "form_submit" || action === "submitLead")) {
      const body = await req.json().catch(() => ({}));
      const { name, email, phone, message, source_site_id } = body;
      
      if (!email) return json({ error: "email required" }, 400);

      const { error } = await sb.from("leads").insert({
        name: name || "Website lead",
        email: email,
        phone: phone || null,
        message: message || null,
        source: "parentcms-form",
        metadata: { site_id: source_site_id || null }
      });

      return json({ ok: !error, error: error?.message });
    }

    // 7. Dynamic Pages (Original actions fallback)
    if (req.method === "GET" && action === "dynamic_page") {
      const path = page_path_clean(url.searchParams.get("path"));
      const slug = path.split("/").filter(Boolean).pop() || "home";
      const { data: blockPage } = await sb.from("page_blocks").select("*").eq("path", path).maybeSingle();
      if (blockPage) return json({ type: blockPage.target || "landing_page", blueprint_id: blockPage.id, data: {}, blocks: blockPage.blocks || [], seo: blockPage.seo || {} });
      
      const { data: page } = await sb.from("cpt_entries").select("*").eq("cpt_slug", "page").eq("slug", slug === "home" ? "home" : slug).eq("status", "published").maybeSingle();
      if (page) return json({ type: "landing_page", data: page, blocks: (page.data as any)?.blocks || [], seo: (page.data as any)?.seo || { title: page.title } });
      return json({ type: "404", data: { path }, blocks: [], seo: { title: "Not found" } });
    }

    return json({ ok: true, schema: "site-config", actions: ["config", "heartbeat", "posts", "taxonomies", "page_view", "form_submit", "dynamic_page"] });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function page_path_clean(p: string | null) {
  const x = (p || "/").trim() || "/";
  return x.startsWith("/") ? x : `/${x}`;
}