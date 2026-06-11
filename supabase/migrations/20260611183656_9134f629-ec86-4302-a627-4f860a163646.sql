
-- =========================================================
-- Dashboard, Sync, SEO Workspace overhaul
-- =========================================================

-- 1) Child-side page view events (for the live counter on the dashboard).
CREATE TABLE IF NOT EXISTS public.page_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_view_events_created_idx ON public.page_view_events (created_at DESC);
CREATE INDEX IF NOT EXISTS page_view_events_path_idx ON public.page_view_events (path);

GRANT SELECT, INSERT ON public.page_view_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_view_events TO authenticated;
GRANT ALL ON public.page_view_events TO service_role;

ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_view_events_public_insert" ON public.page_view_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "page_view_events_admin_read" ON public.page_view_events FOR SELECT TO anon, authenticated USING (true);

-- 2) SEO scores cache (one row per scored page, refreshed by Rescan).
CREATE TABLE IF NOT EXISTS public.seo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,             -- 'static' | 'service' | 'cms' | 'imported' | 'cpt'
  key TEXT NOT NULL UNIQUE,        -- "imp:my-slug", "cms:home", etc.
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  seo_score INT NOT NULL DEFAULT 0,
  geo_score INT NOT NULL DEFAULT 0,
  aeo_score INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  details JSONB,                   -- full checks
  last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seo_scores_total_idx ON public.seo_scores (total_score DESC);
CREATE INDEX IF NOT EXISTS seo_scores_scope_idx ON public.seo_scores (scope);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_scores TO authenticated, anon;
GRANT ALL ON public.seo_scores TO service_role;

ALTER TABLE public.seo_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_scores_all" ON public.seo_scores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER seo_scores_updated_at BEFORE UPDATE ON public.seo_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Redirects manager (301/302).
CREATE TABLE IF NOT EXISTS public.redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL,           -- e.g. /old-page
  to_url   TEXT NOT NULL,            -- absolute or relative
  status_code INT NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  enabled BOOLEAN NOT NULL DEFAULT true,
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact','prefix')),
  notes TEXT,
  hits INT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS redirects_from_unique ON public.redirects (lower(from_path));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirects TO authenticated, anon;
GRANT ALL ON public.redirects TO service_role;

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redirects_all" ON public.redirects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER redirects_updated_at BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Site-wide SEO settings (single row, id='global').
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  base_url TEXT,
  default_title_suffix TEXT,
  default_meta_description TEXT,
  default_focus_keyword TEXT,
  twitter_handle TEXT,
  organization_name TEXT,
  organization_logo TEXT,
  social_image TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_settings TO authenticated, anon;
GRANT ALL ON public.seo_settings TO service_role;

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_settings_all" ON public.seo_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER seo_settings_updated_at BEFORE UPDATE ON public.seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- 5) User table prefs (per-browser fine; also stored server-side for sharing).
CREATE TABLE IF NOT EXISTS public.user_table_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,           -- e.g. "admin:posts:post"
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_table_prefs TO authenticated, anon;
GRANT ALL ON public.user_table_prefs TO service_role;
ALTER TABLE public.user_table_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_table_prefs_all" ON public.user_table_prefs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER user_table_prefs_updated_at BEFORE UPDATE ON public.user_table_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Enable realtime for dashboard + sync tables.
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='page_view_events';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.page_view_events'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='imported_posts';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.imported_posts'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='cpt_entries';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cpt_entries'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sync_events';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_events'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sync_queue';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_queue'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sync_health';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_health'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='redirects';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.redirects'; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
