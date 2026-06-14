-- =========================================================
-- Cloud component library
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cloud_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('section','template','widget')),
  slug TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  thumbnail_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  publisher_id UUID,
  publisher_site_id TEXT,
  recalled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, slug, version)
);

GRANT SELECT ON public.cloud_components TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_components TO authenticated;
GRANT ALL ON public.cloud_components TO service_role;

ALTER TABLE public.cloud_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cloud_components anon read public"
  ON public.cloud_components FOR SELECT TO anon
  USING (visibility = 'public' AND recalled = false);

CREATE POLICY "cloud_components auth read"
  ON public.cloud_components FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cloud_components auth write"
  ON public.cloud_components FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cloud_components auth update"
  ON public.cloud_components FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cloud_components auth delete"
  ON public.cloud_components FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_cloud_components_updated_at
  BEFORE UPDATE ON public.cloud_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS cloud_components_kind_idx ON public.cloud_components (kind, slug);
CREATE INDEX IF NOT EXISTS cloud_components_updated_at_idx ON public.cloud_components (updated_at DESC);

-- =========================================================
-- Install ledger (which site has which component installed)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cloud_component_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  installed_version INTEGER NOT NULL,
  local_id UUID,
  auto_sync BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, kind, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_component_installs TO authenticated;
GRANT ALL ON public.cloud_component_installs TO service_role;

ALTER TABLE public.cloud_component_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installs auth read"
  ON public.cloud_component_installs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "installs auth write"
  ON public.cloud_component_installs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "installs auth update"
  ON public.cloud_component_installs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "installs auth delete"
  ON public.cloud_component_installs FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_cloud_component_installs_updated_at
  BEFORE UPDATE ON public.cloud_component_installs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so child sites get push notifications when the library updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_components;