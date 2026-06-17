CREATE TABLE IF NOT EXISTS public.section_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  thumbnail_url TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local','parent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS section_templates_status_idx ON public.section_templates(status);
CREATE INDEX IF NOT EXISTS section_templates_site_idx ON public.section_templates(site_id);
CREATE INDEX IF NOT EXISTS section_templates_category_idx ON public.section_templates(category);

GRANT SELECT ON public.section_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_templates TO authenticated;
GRANT ALL ON public.section_templates TO service_role;

ALTER TABLE public.section_templates ENABLE ROW LEVEL SECURITY;

-- Public catalog: anyone can browse parent-approved sections.
CREATE POLICY "Public read approved or parent sections" ON public.section_templates
  FOR SELECT USING (status = 'approved' OR source = 'parent' OR auth.uid() IS NOT NULL);

-- Authenticated users can author their own local sections and submit upstream.
CREATE POLICY "Authenticated insert own sections" ON public.section_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update own sections" ON public.section_templates
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Authenticated delete own sections" ON public.section_templates
  FOR DELETE TO authenticated USING (created_by = auth.uid() OR created_by IS NULL);

CREATE TRIGGER section_templates_set_updated_at BEFORE UPDATE ON public.section_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
