// Singleton SEO settings (Base URL, defaults, social handles).
import { supabase } from "@/integrations/supabase/client";

export type SeoSettings = {
  id: string;
  base_url: string | null;
  default_title_suffix: string | null;
  default_meta_description: string | null;
  default_focus_keyword: string | null;
  twitter_handle: string | null;
  organization_name: string | null;
  organization_logo: string | null;
  social_image: string | null;
  updated_at: string;
};

const TBL = "seo_settings" as any;

const fallback = (): SeoSettings => ({
  id: "global",
  base_url: typeof window !== "undefined" ? window.location.origin : "",
  default_title_suffix: null,
  default_meta_description: null,
  default_focus_keyword: null,
  twitter_handle: null,
  organization_name: null,
  organization_logo: null,
  social_image: null,
  updated_at: new Date().toISOString(),
});

export async function getSeoSettings(): Promise<SeoSettings> {
  const { data } = await (supabase.from(TBL) as any).select("*").eq("id", "global").maybeSingle();
  if (!data) return fallback();
  return {
    ...fallback(),
    ...data,
    base_url: data.base_url || fallback().base_url,
  } as SeoSettings;
}

export async function saveSeoSettings(patch: Partial<SeoSettings>) {
  const { error } = await (supabase.from(TBL) as any)
    .upsert({ id: "global", ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

export function resolvedBaseUrl(s: SeoSettings | null | undefined): string {
  const u = (s?.base_url || (typeof window !== "undefined" ? window.location.origin : "")) || "";
  return u.replace(/\/+$/, "");
}
