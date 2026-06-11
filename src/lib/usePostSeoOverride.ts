// React hook: loads any matching post_seo override row for the given
// slug and exposes it. Used by BlogPost / DynamicPage to layer
// Rank Math-style SEO + JSON-LD on top of the parent post's defaults.

import { useEffect, useState } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";

export type PostSeoOverride = {
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  robots?: any;
  schema_json?: any[];
  social?: any;
};

export function usePostSeoOverride(slug?: string | null) {
  const [seo, setSeo] = useState<PostSeoOverride | null>(null);

  useEffect(() => {
    if (!slug) { setSeo(null); return; }
    let cancel = false;
    (cloud.from("post_seo" as any) as any)
      .select("seo_title,seo_description,canonical_url,robots,schema_json,social")
      .eq("slug", slug)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancel) setSeo(data || null);
      });
    return () => { cancel = true; };
  }, [slug]);

  return seo;
}

export function robotsToString(r: any): string | undefined {
  if (!r) return undefined;
  const parts: string[] = [];
  parts.push(r.index === false ? "noindex" : "index");
  parts.push(r.follow === false ? "nofollow" : "follow");
  if (r.archive === false) parts.push("noarchive");
  if (r.imageindex === false) parts.push("noimageindex");
  if (r.snippet === false) parts.push("nosnippet");
  if (typeof r.max_snippet === "number" && r.max_snippet !== -1) parts.push(`max-snippet:${r.max_snippet}`);
  if (r.max_image_preview) parts.push(`max-image-preview:${r.max_image_preview}`);
  if (typeof r.max_video_preview === "number" && r.max_video_preview !== -1) parts.push(`max-video-preview:${r.max_video_preview}`);
  return parts.join(", ");
}
