-- Make THIS project act as Parent Management: create minimal `posts` and `media_library` tables
-- so parent.from('posts') / parent.from('media_library') stop 404'ing.

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'post',
  status TEXT NOT NULL DEFAULT 'draft',
  excerpt TEXT,
  body TEXT,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  template TEXT,
  parent_id UUID,
  render_mode TEXT,
  elementor_data JSONB,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  author TEXT,
  categories JSONB,
  tags JSONB,
  publish_date TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_site_idx ON public.posts(site_id);
CREATE INDEX IF NOT EXISTS posts_slug_idx ON public.posts(slug);
CREATE INDEX IF NOT EXISTS posts_type_idx ON public.posts(type);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published posts" ON public.posts
  FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update posts" ON public.posts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete posts" ON public.posts
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_library_site_idx ON public.media_library(site_id);

GRANT SELECT ON public.media_library TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read media_library" ON public.media_library
  FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert media_library" ON public.media_library
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update media_library" ON public.media_library
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete media_library" ON public.media_library
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER media_library_set_updated_at BEFORE UPDATE ON public.media_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
