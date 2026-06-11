
-- Phase C: Schema builder + internal linking
-- page_schemas: per-page JSON-LD schemas (admin-managed, multi per page)
CREATE TABLE public.page_schemas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_schemas_page_url_idx ON public.page_schemas(page_url);
GRANT SELECT ON public.page_schemas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_schemas TO authenticated;
GRANT ALL ON public.page_schemas TO service_role;
ALTER TABLE public.page_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read enabled schemas" ON public.page_schemas FOR SELECT USING (enabled = true);
CREATE POLICY "Authenticated manage schemas" ON public.page_schemas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_page_schemas_updated_at BEFORE UPDATE ON public.page_schemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- internal_links: cached graph of internal links extracted from content
CREATE TABLE public.internal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  is_external BOOLEAN NOT NULL DEFAULT false,
  source_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX internal_links_source_idx ON public.internal_links(source_url);
CREATE INDEX internal_links_target_idx ON public.internal_links(target_url);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_links TO authenticated;
GRANT ALL ON public.internal_links TO service_role;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage internal_links" ON public.internal_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- link_suggestions: AI/keyword-based suggestions (source -> recommended target with anchor)
CREATE TABLE public.link_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  reason TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX link_suggestions_source_idx ON public.link_suggestions(source_url);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_suggestions TO authenticated;
GRANT ALL ON public.link_suggestions TO service_role;
ALTER TABLE public.link_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage link_suggestions" ON public.link_suggestions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_link_suggestions_updated_at BEFORE UPDATE ON public.link_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
