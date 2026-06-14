
-- API registry table for tracking external API connections (parent management platform, integrations)
CREATE TABLE IF NOT EXISTS public.cms_api_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','degraded','down','disabled')),
  scope TEXT NOT NULL DEFAULT 'parent' CHECK (scope IN ('parent','child','both')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_check_at TIMESTAMPTZ,
  last_check_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_api_registry TO authenticated;
GRANT ALL ON public.cms_api_registry TO service_role;
ALTER TABLE public.cms_api_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage API registry"
  ON public.cms_api_registry FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_cms_api_registry_updated
  BEFORE UPDATE ON public.cms_api_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Heartbeat interval setting + auto-registration token column on installations
ALTER TABLE public.child_installations
  ADD COLUMN IF NOT EXISTS registration_token TEXT,
  ADD COLUMN IF NOT EXISTS auto_upgrade BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'child' CHECK (mode IN ('child','hybrid'));
