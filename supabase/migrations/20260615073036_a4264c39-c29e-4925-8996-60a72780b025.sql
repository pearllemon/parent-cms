CREATE TABLE IF NOT EXISTS public.page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  path text NOT NULL,
  target text NOT NULL DEFAULT 'page',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'visual_editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, path)
);
GRANT SELECT ON public.page_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_blocks public read" ON public.page_blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "page_blocks auth write" ON public.page_blocks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_page_blocks_updated BEFORE UPDATE ON public.page_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.page_block_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_block_id uuid REFERENCES public.page_blocks(id) ON DELETE CASCADE,
  site_id uuid,
  path text NOT NULL,
  target text NOT NULL DEFAULT 'page',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_block_versions TO authenticated;
GRANT ALL ON public.page_block_versions TO service_role;
ALTER TABLE public.page_block_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_block_versions auth read" ON public.page_block_versions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "page_block_versions auth write" ON public.page_block_versions FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.orphan_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  fp text NOT NULL,
  path text,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orphan_edits TO authenticated;
GRANT ALL ON public.orphan_edits TO service_role;
ALTER TABLE public.orphan_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orphan_edits auth read" ON public.orphan_edits FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "orphan_edits auth write" ON public.orphan_edits FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_orphan_edits_updated BEFORE UPDATE ON public.orphan_edits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();