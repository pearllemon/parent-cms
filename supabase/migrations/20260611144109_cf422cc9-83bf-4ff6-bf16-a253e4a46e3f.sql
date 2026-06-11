
-- 1. Relax management-table RLS so parent-mirrored sessions can write.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'custom_post_types','custom_fields','cpt_entries',
    'post_seo','revisions','page_schemas',
    'internal_links','link_suggestions',
    'seo_files','seo_file_versions'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Open read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "Open write %1$s" ON public.%1$I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Open update %1$s" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Open delete %1$s" ON public.%1$I FOR DELETE USING (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END$$;

-- 2. Authors table.
CREATE TABLE IF NOT EXISTS public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  job_title text,
  bio text,
  profile_image_url text,
  email text,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  archive_enabled boolean NOT NULL DEFAULT true,
  parent_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authors TO authenticated;
GRANT ALL ON public.authors TO service_role;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read authors" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Open write authors" ON public.authors FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update authors" ON public.authors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete authors" ON public.authors FOR DELETE USING (true);

CREATE TRIGGER authors_updated_at BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. post_seo: track parent post id for cross-system sync (idempotent).
ALTER TABLE public.post_seo ADD COLUMN IF NOT EXISTS parent_post_id uuid;
CREATE INDEX IF NOT EXISTS post_seo_parent_post_idx ON public.post_seo(parent_post_id);
