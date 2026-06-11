// Public endpoint that serves the latest cached sitemap.xml, robots.txt, or
// llms.txt from `seo_files.manual_content`. The admin UI keeps that column
// up-to-date on every save (auto or manual). For routes you want under the
// site's own domain, configure rewrites that proxy:
//   /sitemap.xml -> <function-url>?type=sitemap
//   /robots.txt  -> <function-url>?type=robots
//   /llms.txt    -> <function-url>?type=llms

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIME: Record<string, string> = {
  sitemap: "application/xml; charset=utf-8",
  robots: "text/plain; charset=utf-8",
  llms: "text/plain; charset=utf-8",
};

const FALLBACK: Record<string, string> = {
  sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`,
  robots: `User-agent: *\nAllow: /\n`,
  llms: `# Site\n`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Accept ?type= OR last path segment (e.g. /seo-file/sitemap.xml)
  let type = url.searchParams.get("type") || "";
  if (!type) {
    const seg = url.pathname.split("/").pop() || "";
    if (seg.startsWith("sitemap")) type = "sitemap";
    else if (seg.startsWith("robots")) type = "robots";
    else if (seg.startsWith("llms")) type = "llms";
  }

  if (!["sitemap", "robots", "llms"].includes(type)) {
    return new Response("Unknown type. Use ?type=sitemap|robots|llms", { status: 400, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("seo_files")
      .select("manual_content")
      .eq("file_type", type)
      .maybeSingle();

    const body = (data?.manual_content as string | null) || FALLBACK[type];

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": MIME[type],
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e) {
    return new Response(FALLBACK[type], {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": MIME[type] },
    });
  }
});
