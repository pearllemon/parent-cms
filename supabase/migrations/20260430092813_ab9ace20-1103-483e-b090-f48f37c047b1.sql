-- Jobs queue (one per import run)
CREATE TABLE public.image_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed | cancelled
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  current_url TEXT,
  log TEXT,
  created_by UUID,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_image_import_jobs_updated
BEFORE UPDATE ON public.image_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.image_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs are viewable by everyone"
  ON public.image_import_jobs FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert jobs"
  ON public.image_import_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update jobs"
  ON public.image_import_jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete jobs"
  ON public.image_import_jobs FOR DELETE TO authenticated USING (true);

-- Per-image assets
CREATE TABLE public.image_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.image_import_jobs(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL UNIQUE,
  storage_path TEXT,
  public_url TEXT,
  alt_text TEXT,
  title TEXT,
  width INTEGER,
  height INTEGER,
  bytes_original BIGINT,
  bytes_optimized BIGINT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed | skipped
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_assets_job ON public.image_assets(job_id);
CREATE INDEX idx_image_assets_status ON public.image_assets(status);

CREATE TRIGGER trg_image_assets_updated
BEFORE UPDATE ON public.image_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are viewable by everyone"
  ON public.image_assets FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert assets"
  ON public.image_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update assets"
  ON public.image_assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete assets"
  ON public.image_assets FOR DELETE TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_import_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_assets;

-- Public storage bucket for optimized images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated can upload post images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Authenticated can update post images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated can delete post images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-images');