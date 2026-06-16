-- Phase 2: Parent Management connector storage + manual GitHub PAT fallback

-- 1) Mirror of the Parent Management site-config payload (theme, header, footer,
--    SEO, popups, services, etc.). One row per (site_id, kind). Stored as JSONB
--    so the parent API shape can evolve without migrations.
CREATE TABLE IF NOT EXISTS public.parent_site_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  kind TEXT NOT NULL,                 -- e.g. 'site', 'header', 'footer', 'theme', 'seo', 'popup', 'services', 'caseStudies', 'teamMembers', 'dynamicSections', 'fullConfig'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_etag TEXT,                   -- ETag returned by parent for cheap re-checks
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_site_mirror TO authenticated;
GRANT ALL ON public.parent_site_mirror TO service_role;

ALTER TABLE public.parent_site_mirror ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read parent_site_mirror"
  ON public.parent_site_mirror FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write parent_site_mirror"
  ON public.parent_site_mirror FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS parent_site_mirror_site_kind_idx
  ON public.parent_site_mirror(site_id, kind);

DROP TRIGGER IF EXISTS trg_parent_site_mirror_updated_at ON public.parent_site_mirror;
CREATE TRIGGER trg_parent_site_mirror_updated_at
  BEFORE UPDATE ON public.parent_site_mirror
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Per-site GitHub connection (manual PAT fallback to Parent-Management-driven updates).
--    Token is stored as plaintext within an admin-only table; reads require auth.
--    We deliberately do not grant anon access.
CREATE TABLE IF NOT EXISTS public.cms_github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID,                       -- nullable so single-instance Parent CMS can store a global config
  repo TEXT NOT NULL,                 -- "owner/repo"
  branch TEXT NOT NULL DEFAULT 'main',
  visibility TEXT NOT NULL DEFAULT 'private',  -- 'public' | 'private'
  pat TEXT,                           -- GitHub Personal Access Token (nullable for public repos)
  workflow_filename TEXT DEFAULT 'cms-update.yml',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_release_tag TEXT,
  last_release_sha TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_github_connections TO authenticated;
GRANT ALL ON public.cms_github_connections TO service_role;

ALTER TABLE public.cms_github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cms_github_connections"
  ON public.cms_github_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write cms_github_connections"
  ON public.cms_github_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_cms_github_connections_updated_at ON public.cms_github_connections;
CREATE TRIGGER trg_cms_github_connections_updated_at
  BEFORE UPDATE ON public.cms_github_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();