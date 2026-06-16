// Fire-and-forget regeneration of the cached SEO files after content
// changes (post publish/update/delete, import complete).
// Re-runs the same builder used by the admin UI and writes the output to
// `seo_files.manual_content` so the public edge endpoint serves fresh data.
// Skips a file when its `auto_enabled` is false (admin opted out).

import { supabase } from "@/integrations/supabase/client";
import { buildSitemap, buildRobots, buildLlms, loadContent } from "@/lib/seoFiles";

type FileType = "sitemap" | "robots" | "llms";

export async function regenerateSeoFiles(
  baseUrl: string,
  siteId?: string | null,
  siteName?: string,
  only?: FileType[],
): Promise<void> {
  try {
    const { data } = await supabase.from("seo_files" as any).select("*");
    const rows = ((data as any[]) || []).filter((r) => !only || only.includes(r.file_type));
    if (!rows.length) return;

    const needsContent = rows.some((r) => r.auto_enabled && (r.file_type === "sitemap" || r.file_type === "llms"));
    const content = needsContent ? await loadContent(siteId || null) : { parent: [], imported: [] };

    for (const r of rows) {
      if (!r.auto_enabled) continue;
      let generated = "";
      if (r.file_type === "sitemap") generated = buildSitemap(baseUrl, r.settings || {}, content);
      else if (r.file_type === "robots") generated = buildRobots(baseUrl, r.settings || {});
      else if (r.file_type === "llms") generated = buildLlms(baseUrl, r.settings || {}, content, siteName);

      if (!generated) continue;

      await supabase.from("seo_files" as any).update({
        manual_content: generated,
        last_generated_at: new Date().toISOString(),
      }).eq("file_type", r.file_type);

      await supabase.from("seo_file_versions" as any).insert({
        file_type: r.file_type,
        content: generated,
        settings: r.settings || {},
        note: "Auto-regenerated after content change",
      });
    }
  } catch (e) {
    // Non-fatal — admin can always click Regenerate manually.
    console.warn("[regenerateSeoFiles] failed:", e);
  }
}
