ALTER TABLE public.image_assets
  ADD COLUMN IF NOT EXISTS seo_slug TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMPTZ;

ALTER TABLE public.image_import_jobs
  ADD COLUMN IF NOT EXISTS replacements INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_image_assets_job_status ON public.image_assets(job_id, status);
CREATE INDEX IF NOT EXISTS idx_image_assets_source_url ON public.image_assets(source_url);
CREATE INDEX IF NOT EXISTS idx_image_assets_public_url_done ON public.image_assets(public_url) WHERE status = 'done';
CREATE INDEX IF NOT EXISTS idx_imported_posts_type_status ON public.imported_posts(type, status);
CREATE INDEX IF NOT EXISTS idx_imported_posts_updated_at ON public.imported_posts(updated_at DESC);