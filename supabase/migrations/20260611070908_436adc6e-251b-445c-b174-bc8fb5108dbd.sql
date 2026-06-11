
ALTER TABLE public.imported_posts
  ADD COLUMN IF NOT EXISTS elementor_data jsonb,
  ADD COLUMN IF NOT EXISTS render_mode text NOT NULL DEFAULT 'auto';

CREATE TABLE IF NOT EXISTS public.elementor_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  kind text NOT NULL DEFAULT 'section',
  title text,
  slug text,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  location text,
  source text NOT NULL DEFAULT 'elementor',
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.elementor_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elementor_templates TO authenticated;
GRANT ALL ON public.elementor_templates TO service_role;
ALTER TABLE public.elementor_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "elementor_templates public read" ON public.elementor_templates FOR SELECT USING (true);
CREATE POLICY "elementor_templates auth insert" ON public.elementor_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "elementor_templates auth update" ON public.elementor_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "elementor_templates auth delete" ON public.elementor_templates FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_elementor_templates_updated_at
  BEFORE UPDATE ON public.elementor_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS elementor_templates_kind_idx ON public.elementor_templates(kind);
CREATE INDEX IF NOT EXISTS elementor_templates_slug_idx ON public.elementor_templates(slug);

CREATE TABLE IF NOT EXISTS public.elementor_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  title text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.elementor_site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elementor_site_settings TO authenticated;
GRANT ALL ON public.elementor_site_settings TO service_role;
ALTER TABLE public.elementor_site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "elementor_site_settings public read" ON public.elementor_site_settings FOR SELECT USING (true);
CREATE POLICY "elementor_site_settings auth insert" ON public.elementor_site_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "elementor_site_settings auth update" ON public.elementor_site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "elementor_site_settings auth delete" ON public.elementor_site_settings FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_elementor_site_settings_updated_at
  BEFORE UPDATE ON public.elementor_site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
