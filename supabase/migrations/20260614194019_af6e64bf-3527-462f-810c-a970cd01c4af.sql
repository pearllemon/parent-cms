
CREATE TABLE public.cms_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  sdk_url text,
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  changelog text,
  min_compatible_child_version text,
  is_latest boolean NOT NULL DEFAULT false,
  recalled boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_releases TO authenticated;
GRANT ALL ON public.cms_releases TO service_role;
GRANT SELECT ON public.cms_releases TO anon;
ALTER TABLE public.cms_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_releases read" ON public.cms_releases FOR SELECT USING (true);
CREATE POLICY "cms_releases write" ON public.cms_releases FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cms_releases_updated BEFORE UPDATE ON public.cms_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cms_migration_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL REFERENCES public.cms_releases(version) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  kind text NOT NULL CHECK (kind IN ('sql','js','noop')),
  description text,
  payload text NOT NULL DEFAULT '',
  reversible boolean NOT NULL DEFAULT false,
  down_payload text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_migration_manifest TO authenticated;
GRANT ALL ON public.cms_migration_manifest TO service_role;
GRANT SELECT ON public.cms_migration_manifest TO anon;
ALTER TABLE public.cms_migration_manifest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_mm read" ON public.cms_migration_manifest FOR SELECT USING (true);
CREATE POLICY "cms_mm write" ON public.cms_migration_manifest FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.child_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL UNIQUE,
  site_name text,
  site_url text,
  current_version text,
  child_shim_version text,
  upgrade_state text NOT NULL DEFAULT 'unknown'
    CHECK (upgrade_state IN ('unknown','up_to_date','pending','upgrading','failed','rolled_back')),
  last_error text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_installations TO authenticated;
GRANT ALL ON public.child_installations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.child_installations TO anon;
ALTER TABLE public.child_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_inst read" ON public.child_installations FOR SELECT USING (true);
CREATE POLICY "child_inst write" ON public.child_installations FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_child_installations_updated BEFORE UPDATE ON public.child_installations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.child_upgrade_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  from_version text,
  to_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','success','failed','rolled_back')),
  snapshot jsonb,
  error text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_upgrade_log TO authenticated;
GRANT ALL ON public.child_upgrade_log TO service_role;
GRANT SELECT, INSERT ON public.child_upgrade_log TO anon;
ALTER TABLE public.child_upgrade_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_log read" ON public.child_upgrade_log FOR SELECT USING (true);
CREATE POLICY "child_log write" ON public.child_upgrade_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_child_upgrade_log_site ON public.child_upgrade_log(site_id, created_at DESC);
CREATE INDEX idx_cms_mm_version ON public.cms_migration_manifest(version, order_index);
