// Loads/saves SEO data per post.
// Storage: child-side `post_seo` table keyed by (scope, post_id).
// When scope='parent' we also try to mirror writeable fields to the
// parent CMS posts row (best-effort; ignored if parent schema lacks
// the columns).

import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";

export type Scope = "parent" | "imported";

export type RobotsMeta = {
  index: boolean;
  follow: boolean;
  archive: boolean;
  imageindex: boolean;
  snippet: boolean;
  max_snippet: number;
  max_image_preview: "none" | "standard" | "large";
  max_video_preview: number;
};

export type SocialMeta = {
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  twitter_card: "summary" | "summary_large_image";
};

export type PostSeo = {
  id?: string;
  scope: Scope;
  post_id: string;
  slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[];
  pillar?: boolean;
  canonical_url?: string | null;
  robots: RobotsMeta;
  schema_json: any[];
  social: SocialMeta;
  extra: Record<string, any>;
  last_score?: number | null;
};

export const DEFAULT_ROBOTS: RobotsMeta = {
  index: true,
  follow: true,
  archive: true,
  imageindex: true,
  snippet: true,
  max_snippet: -1,
  max_image_preview: "large",
  max_video_preview: -1,
};

export const DEFAULT_SOCIAL: SocialMeta = {
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_title: null,
  twitter_description: null,
  twitter_image: null,
  twitter_card: "summary_large_image",
};

export const emptySeo = (scope: Scope, post_id: string, slug?: string | null): PostSeo => ({
  scope,
  post_id,
  slug: slug ?? null,
  seo_title: null,
  seo_description: null,
  focus_keyword: null,
  secondary_keywords: [],
  pillar: false,
  canonical_url: null,
  robots: { ...DEFAULT_ROBOTS },
  schema_json: [],
  social: { ...DEFAULT_SOCIAL },
  extra: {},
  last_score: null,
});

export async function loadPostSeo(scope: Scope, post_id: string): Promise<PostSeo | null> {
  const { data } = await (cloud.from("post_seo" as any) as any)
    .select("*")
    .eq("scope", scope)
    .eq("post_id", post_id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    robots: { ...DEFAULT_ROBOTS, ...(data.robots || {}) },
    social: { ...DEFAULT_SOCIAL, ...(data.social || {}) },
    schema_json: data.schema_json || [],
    extra: data.extra || {},
    secondary_keywords: data.secondary_keywords || [],
  } as PostSeo;
}

export async function loadPostSeoMany(
  rows: { scope: Scope; post_id: string }[],
): Promise<Record<string, PostSeo>> {
  if (!rows.length) return {};
  const ids = rows.map((r) => r.post_id);
  const { data } = await (cloud.from("post_seo" as any) as any).select("*").in("post_id", ids);
  const out: Record<string, PostSeo> = {};
  (data || []).forEach((d: any) => {
    out[`${d.scope}::${d.post_id}`] = {
      ...d,
      robots: { ...DEFAULT_ROBOTS, ...(d.robots || {}) },
      social: { ...DEFAULT_SOCIAL, ...(d.social || {}) },
      schema_json: d.schema_json || [],
      extra: d.extra || {},
      secondary_keywords: d.secondary_keywords || [],
    };
  });
  return out;
}

export async function savePostSeo(seo: PostSeo): Promise<void> {
  const payload = {
    scope: seo.scope,
    post_id: seo.post_id,
    slug: seo.slug,
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    focus_keyword: seo.focus_keyword,
    secondary_keywords: seo.secondary_keywords || [],
    pillar: !!seo.pillar,
    canonical_url: seo.canonical_url,
    robots: seo.robots,
    schema_json: seo.schema_json,
    social: seo.social,
    extra: seo.extra || {},
    last_score: seo.last_score ?? null,
  };
  const { error } = await (cloud.from("post_seo" as any) as any).upsert(payload, {
    onConflict: "scope,post_id",
  });
  if (error) throw error;

  // Best-effort mirror to parent posts row.
  if (seo.scope === "parent") {
    try {
      await (parent.from("posts") as any)
        .update({
          meta_title: seo.seo_title,
          meta_description: seo.seo_description,
          canonical_url: seo.canonical_url,
          focus_keyword: seo.focus_keyword,
        })
        .eq("id", seo.post_id);
    } catch {
      /* parent schema may not have these columns; ignore */
    }
  }
}
