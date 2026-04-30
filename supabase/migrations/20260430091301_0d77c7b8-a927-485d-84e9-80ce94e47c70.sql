-- Create import_history table to persist past WP XML imports
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'wp-xml',
  file_name TEXT,
  file_size_bytes BIGINT,
  parsed_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_sample TEXT,
  imported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_history_site_created ON public.import_history(site_id, created_at DESC);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Import history viewable by everyone"
  ON public.import_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert import history"
  ON public.import_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete import history"
  ON public.import_history FOR DELETE
  TO authenticated
  USING (true);