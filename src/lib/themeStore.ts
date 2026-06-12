// Theme Designer storage: sections, templates, global tokens.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type ThemeSection = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  blocks: unknown[];
  variants: { id: string; name: string; blocks: unknown[] }[];
  design_tokens: Record<string, unknown>;
  version: number;
  is_global: boolean;
  source: "child" | "parent";
  parent_section_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ThemeTemplate = {
  id: string;
  slug: string;
  name: string;
  kind: TemplateKind;
  description: string | null;
  blocks: unknown[];
  preview_url: string | null;
  version: number;
  is_default: boolean;
  source: "child" | "parent";
  created_at: string;
  updated_at: string;
};

export type TemplateKind =
  | "service" | "blog" | "product" | "case_study" | "post"
  | "header" | "footer" | "popup" | "archive" | "page";

export const SECTION_CATEGORIES = [
  "Hero", "Logos", "Featured In", "Lead Forms", "CTA",
  "Book a Call", "Contact", "Stats", "Testimonials", "FAQ",
  "Pricing", "Team", "Case Studies", "Blog", "SEO Widgets", "General",
] as const;

export const TEMPLATE_KINDS: { value: TemplateKind; label: string }[] = [
  { value: "service", label: "Service Template" },
  { value: "blog", label: "Blog Template" },
  { value: "product", label: "Product Template" },
  { value: "case_study", label: "Case Study Template" },
  { value: "post", label: "Post Template" },
  { value: "page", label: "Page Template" },
  { value: "header", label: "Header Template" },
  { value: "footer", label: "Footer Template" },
  { value: "popup", label: "Popup Template" },
  { value: "archive", label: "Archive Template" },
];

export async function listSections(): Promise<ThemeSection[]> {
  const { data } = await db.from("theme_sections").select("*").order("category").order("name");
  return (data as ThemeSection[]) || [];
}

export async function saveSection(s: Partial<ThemeSection> & { name: string; slug: string; category: string }): Promise<ThemeSection | null> {
  const payload = {
    slug: s.slug,
    name: s.name,
    category: s.category,
    description: s.description ?? null,
    blocks: s.blocks ?? [],
    variants: s.variants ?? [],
    design_tokens: s.design_tokens ?? {},
    is_global: s.is_global ?? false,
  };
  if (s.id) {
    const { data } = await db.from("theme_sections").update(payload).eq("id", s.id).select().maybeSingle();
    return data as ThemeSection | null;
  }
  const { data } = await db.from("theme_sections").insert(payload).select().maybeSingle();
  return data as ThemeSection | null;
}

export async function deleteSection(id: string) {
  await db.from("theme_sections").delete().eq("id", id);
}

export async function listTemplates(): Promise<ThemeTemplate[]> {
  const { data } = await db.from("theme_templates").select("*").order("kind").order("name");
  return (data as ThemeTemplate[]) || [];
}

export async function saveTemplate(t: Partial<ThemeTemplate> & { name: string; slug: string; kind: TemplateKind }): Promise<ThemeTemplate | null> {
  const payload = {
    slug: t.slug,
    name: t.name,
    kind: t.kind,
    description: t.description ?? null,
    blocks: t.blocks ?? [],
    is_default: t.is_default ?? false,
  };
  if (t.id) {
    const { data } = await db.from("theme_templates").update(payload).eq("id", t.id).select().maybeSingle();
    return data as ThemeTemplate | null;
  }
  const { data } = await db.from("theme_templates").insert(payload).select().maybeSingle();
  return data as ThemeTemplate | null;
}

export async function deleteTemplate(id: string) {
  await db.from("theme_templates").delete().eq("id", id);
}

// Global tokens (single row)
export type ThemeTokens = {
  id?: string;
  colors: Record<string, string>;
  typography: { fontFamilyHeading?: string; fontFamilyBody?: string; baseSize?: number; scale?: number };
  spacing: Record<string, number>;
  breakpoints: { mobile: number; tablet: number; desktop: number };
};

export const DEFAULT_TOKENS: ThemeTokens = {
  colors: { primary: "#111111", accent: "#e94560", background: "#ffffff", foreground: "#0f172a" },
  typography: { fontFamilyHeading: "Inter", fontFamilyBody: "Inter", baseSize: 16, scale: 1.25 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
};

export async function loadTokens(): Promise<ThemeTokens> {
  const { data } = await db.from("theme_tokens").select("*").limit(1).maybeSingle();
  if (!data) return DEFAULT_TOKENS;
  return {
    id: data.id,
    colors: { ...DEFAULT_TOKENS.colors, ...(data.colors || {}) },
    typography: { ...DEFAULT_TOKENS.typography, ...(data.typography || {}) },
    spacing: { ...DEFAULT_TOKENS.spacing, ...(data.spacing || {}) },
    breakpoints: { ...DEFAULT_TOKENS.breakpoints, ...(data.breakpoints || {}) },
  };
}

export async function saveTokens(t: ThemeTokens): Promise<void> {
  if (t.id) {
    await db.from("theme_tokens").update({
      colors: t.colors, typography: t.typography, spacing: t.spacing, breakpoints: t.breakpoints,
    }).eq("id", t.id);
  } else {
    await db.from("theme_tokens").insert({
      colors: t.colors, typography: t.typography, spacing: t.spacing, breakpoints: t.breakpoints,
    });
  }
}
