// Form Builder API — list/get/save/submit form definitions and ingest submissions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (req.method === "GET" && action === "forms") {
      const site_id = url.searchParams.get("site_id");
      let q = supabase.from("form_definitions").select("*").order("updated_at", { ascending: false });
      if (site_id) q = q.eq("site_id", site_id);
      const { data, error } = await q;
      if (error) throw error;
      return json({ forms: data });
    }

    if (req.method === "GET" && action === "form") {
      const id = url.searchParams.get("id");
      const slug = url.searchParams.get("slug");
      if (!id && !slug) return json({ error: "id or slug required" }, 400);
      const q = supabase.from("form_definitions").select("*").limit(1);
      const { data, error } = await (id ? q.eq("id", id) : q.eq("slug", slug!));
      if (error) throw error;
      return json({ form: data?.[0] ?? null });
    }

    if (req.method === "POST" && action === "form_save") {
      const body = await req.json();
      if (!body?.name || !body?.slug) return json({ error: "name and slug required" }, 400);
      const payload = {
        id: body.id,
        site_id: body.site_id ?? null,
        name: String(body.name).slice(0, 200),
        slug: String(body.slug).slice(0, 120).toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
        fields: Array.isArray(body.fields) ? body.fields : [],
        settings: body.settings ?? {},
        submit_action: body.submit_action ?? "lead",
        redirect_url: body.redirect_url ?? null,
        email_to: body.email_to ?? null,
        version: (body.version ?? 0) + 1,
      };
      const { data, error } = await supabase
        .from("form_definitions")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return json({ form: data });
    }

    if (req.method === "POST" && action === "form_field_reorder") {
      const { id, fields } = await req.json();
      if (!id || !Array.isArray(fields)) return json({ error: "id+fields required" }, 400);
      const { data, error } = await supabase
        .from("form_definitions")
        .update({ fields })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ form: data });
    }

    if (req.method === "POST" && action === "form_submit") {
      const body = await req.json();
      const { form_id, form_slug, values, source_url } = body || {};
      if (!values || typeof values !== "object") return json({ error: "values required" }, 400);

      const q = supabase.from("form_definitions").select("*").limit(1);
      const { data: forms } = await (form_id ? q.eq("id", form_id) : q.eq("slug", String(form_slug || "")));
      const form = forms?.[0];
      if (!form) return json({ error: "form not found" }, 404);

      // Server-side validation against schema
      const errs: Record<string, string> = {};
      for (const f of (form.fields || []) as Array<Record<string, unknown>>) {
        const key = String(f.key || "");
        const v = (values as Record<string, unknown>)[key];
        if (f.required && (v === undefined || v === null || v === "")) {
          errs[key] = `${f.label || key} is required`;
          continue;
        }
        const val = f.validation as { pattern?: string; min?: number; max?: number; message?: string } | undefined;
        if (val?.pattern && typeof v === "string" && !new RegExp(val.pattern).test(v))
          errs[key] = val.message || `${f.label} is invalid`;
        if (typeof v === "string" && val?.max && v.length > val.max) errs[key] = `${f.label} too long`;
      }
      if (Object.keys(errs).length) return json({ error: "validation", fields: errs }, 400);

      // Persist as a lead row (mapped fields when present)
      const v = values as Record<string, string>;
      const { error } = await supabase.from("leads").insert({
        name: v.name || v.full_name || "Unknown",
        email: v.email || "no-reply@example.com",
        phone: v.phone || null,
        message: v.message || v.notes || null,
        source: `form:${form.slug}`,
        source_url: source_url || null,
        metadata: { form_id: form.id, form_version: form.version, values },
      });
      if (error) throw error;

      return json({ ok: true, redirect_url: form.redirect_url });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
