
CREATE TABLE IF NOT EXISTS public.post_seo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('parent','imported')),
  post_id TEXT NOT NULL,
  slug TEXT,
  seo_title TEXT,
  seo_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',
  pillar BOOLEAN NOT NULL DEFAULT false,
  canonical_url TEXT,
  robots JSONB NOT NULL DEFAULT '{"index":true,"follow":true,"archive":true,"imageindex":true,"snippet":true,"max_snippet":-1,"max_image_preview":"large","max_video_preview":-1}'::jsonb,
  schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  social JSONB NOT NULL DEFAULT '{"og_title":null,"og_description":null,"og_image":null,"twitter_title":null,"twitter_description":null,"twitter_image":null,"twitter_card":"summary_large_image"}'::jsonb,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_score INTEGER,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, post_id)
);

GRANT SELECT ON public.post_seo TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_seo TO authenticated;
GRANT ALL ON public.post_seo TO service_role;

ALTER TABLE public.post_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read post_seo"
  ON public.post_seo FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Auth insert post_seo"
  ON public.post_seo FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth update post_seo"
  ON public.post_seo FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth delete post_seo"
  ON public.post_seo FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS post_seo_scope_post_idx ON public.post_seo (scope, post_id);
CREATE INDEX IF NOT EXISTS post_seo_slug_idx ON public.post_seo (slug);

CREATE TRIGGER post_seo_updated_at
  BEFORE UPDATE ON public.post_seo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
