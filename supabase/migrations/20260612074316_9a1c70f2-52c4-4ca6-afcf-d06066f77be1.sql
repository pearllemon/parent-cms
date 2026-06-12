
-- Theme sections (reusable design blocks)
CREATE TABLE public.theme_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  slug text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  design_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_global boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'child',
  parent_section_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX theme_sections_slug_idx ON public.theme_sections(slug);
CREATE INDEX theme_sections_category_idx ON public.theme_sections(category);
GRANT SELECT ON public.theme_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_sections TO authenticated;
GRANT ALL ON public.theme_sections TO service_role;
ALTER TABLE public.theme_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theme_sections public read" ON public.theme_sections FOR SELECT USING (true);
CREATE POLICY "theme_sections admin write" ON public.theme_sections FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER theme_sections_updated BEFORE UPDATE ON public.theme_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Theme templates (page-level templates by kind)
CREATE TABLE public.theme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  slug text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'page',
  description text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_url text,
  version integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'child',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX theme_templates_kind_idx ON public.theme_templates(kind);
GRANT SELECT ON public.theme_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_templates TO authenticated;
GRANT ALL ON public.theme_templates TO service_role;
ALTER TABLE public.theme_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theme_templates public read" ON public.theme_templates FOR SELECT USING (true);
CREATE POLICY "theme_templates admin write" ON public.theme_templates FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER theme_templates_updated BEFORE UPDATE ON public.theme_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global design tokens (single row per site)
CREATE TABLE public.theme_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid UNIQUE,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  spacing jsonb NOT NULL DEFAULT '{}'::jsonb,
  breakpoints jsonb NOT NULL DEFAULT '{"mobile":640,"tablet":1024,"desktop":1280}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theme_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_tokens TO authenticated;
GRANT ALL ON public.theme_tokens TO service_role;
ALTER TABLE public.theme_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theme_tokens public read" ON public.theme_tokens FOR SELECT USING (true);
CREATE POLICY "theme_tokens admin write" ON public.theme_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER theme_tokens_updated BEFORE UPDATE ON public.theme_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Taxonomies (definitions: category, tag, custom)
CREATE TABLE public.taxonomies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  label_singular text NOT NULL,
  hierarchical boolean NOT NULL DEFAULT false,
  applies_to text[] NOT NULL DEFAULT ARRAY['post']::text[],
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxonomies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomies TO authenticated;
GRANT ALL ON public.taxonomies TO service_role;
ALTER TABLE public.taxonomies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxonomies public read" ON public.taxonomies FOR SELECT USING (true);
CREATE POLICY "taxonomies admin write" ON public.taxonomies FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER taxonomies_updated BEFORE UPDATE ON public.taxonomies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Taxonomy terms (hierarchical, w/ SEO fields)
CREATE TABLE public.taxonomy_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id uuid NOT NULL REFERENCES public.taxonomies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  seo_title text,
  seo_description text,
  og_image text,
  canonical_url text,
  schema_json jsonb,
  archive_template_id uuid REFERENCES public.theme_templates(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(taxonomy_id, slug)
);
CREATE INDEX taxonomy_terms_parent_idx ON public.taxonomy_terms(parent_id);
GRANT SELECT ON public.taxonomy_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_terms TO authenticated;
GRANT ALL ON public.taxonomy_terms TO service_role;
ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxonomy_terms public read" ON public.taxonomy_terms FOR SELECT USING (true);
CREATE POLICY "taxonomy_terms admin write" ON public.taxonomy_terms FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER taxonomy_terms_updated BEFORE UPDATE ON public.taxonomy_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Entry-to-term assignments (works for posts, pages, cpt entries, imported_posts)
CREATE TABLE public.entry_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL,
  entry_id text NOT NULL,
  term_id uuid NOT NULL REFERENCES public.taxonomy_terms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_type, entry_id, term_id)
);
CREATE INDEX entry_terms_entry_idx ON public.entry_terms(entry_type, entry_id);
CREATE INDEX entry_terms_term_idx ON public.entry_terms(term_id);
GRANT SELECT ON public.entry_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_terms TO authenticated;
GRANT ALL ON public.entry_terms TO service_role;
ALTER TABLE public.entry_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entry_terms public read" ON public.entry_terms FOR SELECT USING (true);
CREATE POLICY "entry_terms admin write" ON public.entry_terms FOR ALL USING (true) WITH CHECK (true);

-- Seed default taxonomies
INSERT INTO public.taxonomies (slug, name, label_singular, hierarchical, applies_to, description)
VALUES
  ('category', 'Categories', 'Category', true,  ARRAY['post','page']::text[], 'Hierarchical content groupings'),
  ('tag',      'Tags',       'Tag',      false, ARRAY['post']::text[],         'Flat content labels')
ON CONFLICT (slug) DO NOTHING;
