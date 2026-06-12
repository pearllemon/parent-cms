
CREATE TABLE public.template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.theme_templates(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,            -- 'global' | 'cpt' | 'route' | 'taxonomy'
  target TEXT NOT NULL,           -- e.g. 'header', 'footer', cpt slug, route path, taxonomy slug
  kind TEXT NOT NULL,             -- duplicate of template kind for fast lookup
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, target, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_assignments TO authenticated;
GRANT SELECT ON public.template_assignments TO anon;
GRANT ALL ON public.template_assignments TO service_role;
ALTER TABLE public.template_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl_assign_read" ON public.template_assignments FOR SELECT USING (true);
CREATE POLICY "tpl_assign_write" ON public.template_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_tpl_assign_upd BEFORE UPDATE ON public.template_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,           -- create|update|delete|restore|publish|login|...
  entity_type TEXT NOT NULL,      -- post|page|theme_section|theme_template|cpt|media|user|...
  entity_id TEXT,
  entity_label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_read" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "activity_write" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE INDEX idx_activity_created ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_entity ON public.activity_log (entity_type, entity_id);
