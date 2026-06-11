
CREATE TABLE public.seo_files (
  file_type text PRIMARY KEY CHECK (file_type IN ('sitemap','robots','llms')),
  auto_enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_content text,
  last_generated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.seo_files TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_files TO authenticated;
GRANT ALL ON public.seo_files TO service_role;

ALTER TABLE public.seo_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_files read all" ON public.seo_files FOR SELECT USING (true);
CREATE POLICY "seo_files write auth" ON public.seo_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.seo_file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type text NOT NULL,
  content text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX seo_file_versions_type_idx ON public.seo_file_versions(file_type, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.seo_file_versions TO authenticated;
GRANT ALL ON public.seo_file_versions TO service_role;

ALTER TABLE public.seo_file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_versions read auth" ON public.seo_file_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "seo_versions write auth" ON public.seo_file_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER seo_files_updated_at BEFORE UPDATE ON public.seo_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_files (file_type, settings) VALUES
  ('sitemap', '{"include_static":true,"include_services":true,"include_posts":true,"include_pages":true,"include_imported":true,"exclude_slugs":[],"exclude_types":[]}'::jsonb),
  ('robots',  '{"rules":[{"user_agent":"*","allow":["/"],"disallow":["/admin"]}],"include_sitemap":true}'::jsonb),
  ('llms',    '{"site_name":"","summary":"","sections":{"pages":true,"blog":true,"services":true},"exclude_paths":["/admin","/lovable","/not-found"],"directives":""}'::jsonb)
ON CONFLICT (file_type) DO NOTHING;
