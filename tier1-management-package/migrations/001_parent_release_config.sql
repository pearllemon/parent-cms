-- Tier 1 — Parent Management add-on.
-- Run this against the Parent Management Supabase project.

-- 1. Singleton config row -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_release_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                BOOLEAN NOT NULL DEFAULT TRUE,
  parent_repo              TEXT NOT NULL,
  default_branch           TEXT NOT NULL DEFAULT 'main',
  update_workflow_filename TEXT NOT NULL DEFAULT 'cms-update.yml',
  signing_public_key       TEXT,
  registry_endpoints       JSONB NOT NULL DEFAULT '{}'::jsonb,
  release_policy           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parent_release_config_singleton UNIQUE (singleton)
);

GRANT SELECT ON public.parent_release_config TO authenticated;
GRANT ALL    ON public.parent_release_config TO service_role;

ALTER TABLE public.parent_release_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "release_config readable to authenticated"
  ON public.parent_release_config FOR SELECT
  TO authenticated
  USING (true);

-- 2. Registered sites ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_managed_sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             TEXT NOT NULL UNIQUE,
  install_token       TEXT NOT NULL UNIQUE,
  site_url            TEXT,
  github_repo         TEXT,
  update_channel      TEXT NOT NULL DEFAULT 'stable'
                       CHECK (update_channel IN ('stable','beta')),
  auto_update         BOOLEAN NOT NULL DEFAULT FALSE,
  current_version     TEXT,
  current_sha         TEXT,
  last_config_pull_at TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_managed_sites TO authenticated;
GRANT ALL                            ON public.parent_managed_sites TO service_role;

ALTER TABLE public.parent_managed_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managed_sites authenticated full access"
  ON public.parent_managed_sites FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Upgrade log --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.child_upgrade_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     TEXT NOT NULL,
  github_repo TEXT,
  target_ref  TEXT,
  status      TEXT NOT NULL DEFAULT 'dispatched',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.child_upgrade_log TO authenticated;
GRANT ALL            ON public.child_upgrade_log TO service_role;

ALTER TABLE public.child_upgrade_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upgrade_log readable to authenticated"
  ON public.child_upgrade_log FOR SELECT TO authenticated USING (true);

-- 4. updated_at trigger -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_parent_release_config_touch ON public.parent_release_config;
CREATE TRIGGER trg_parent_release_config_touch
  BEFORE UPDATE ON public.parent_release_config
  FOR EACH ROW EXECUTE FUNCTION public.parent_touch_updated_at();

DROP TRIGGER IF EXISTS trg_parent_managed_sites_touch ON public.parent_managed_sites;
CREATE TRIGGER trg_parent_managed_sites_touch
  BEFORE UPDATE ON public.parent_managed_sites
  FOR EACH ROW EXECUTE FUNCTION public.parent_touch_updated_at();