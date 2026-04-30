-- Imported WordPress posts stored in Lovable Cloud
CREATE TABLE public.imported_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '(untitled)',
  slug TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  type TEXT NOT NULL DEFAULT 'post',
  publish_date TIMESTAMPTZ,
  featured_image_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  source TEXT NOT NULL DEFAULT 'wp-xml',
  imported_by UUID,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX idx_imported_posts_site ON public.imported_posts(site_id);
CREATE INDEX idx_imported_posts_status ON public.imported_posts(status);
CREATE INDEX idx_imported_posts_type ON public.imported_posts(type);

ALTER TABLE public.imported_posts ENABLE ROW LEVEL SECURITY;

-- Public read (matches the rest of the public-facing site behaviour)
CREATE POLICY "Imported posts are viewable by everyone"
  ON public.imported_posts FOR SELECT
  USING (true);

-- Any authenticated user can insert/update/delete their imports
CREATE POLICY "Authenticated users can insert imported posts"
  ON public.imported_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update imported posts"
  ON public.imported_posts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete imported posts"
  ON public.imported_posts FOR DELETE
  TO authenticated
  USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_imported_posts_updated_at
BEFORE UPDATE ON public.imported_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();