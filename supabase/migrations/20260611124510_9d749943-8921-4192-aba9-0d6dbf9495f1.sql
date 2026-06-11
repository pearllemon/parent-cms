
-- 1. SYNC SETTINGS (one row per resource type)
CREATE TABLE public.sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_accept BOOLEAN NOT NULL DEFAULT false,
  direction TEXT NOT NULL DEFAULT 'pull' CHECK (direction IN ('pull','push','two-way','disabled')),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_settings TO authenticated;
GRANT ALL ON public.sync_settings TO service_role;
ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync_settings" ON public.sync_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sync_settings" ON public.sync_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. SYNC EVENTS (append-only log)
CREATE TABLE public.sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('push','pull','accept','reject','auto_accept','conflict','error','heartbeat')),
  direction TEXT NOT NULL DEFAULT 'pull' CHECK (direction IN ('pull','push','two-way')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failure','pending','partial')),
  latency_ms INT,
  payload JSONB,
  error_message TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_events_created ON public.sync_events (created_at DESC);
CREATE INDEX idx_sync_events_resource ON public.sync_events (resource_type, created_at DESC);
GRANT SELECT, INSERT ON public.sync_events TO authenticated;
GRANT ALL ON public.sync_events TO service_role;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync_events" ON public.sync_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sync_events" ON public.sync_events FOR INSERT TO authenticated WITH CHECK (true);

-- 3. SYNC QUEUE (pending incoming updates from parent)
CREATE TABLE public.sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  source TEXT NOT NULL DEFAULT 'parent',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','applied','failed','expired')),
  decision_by UUID,
  decision_at TIMESTAMPTZ,
  decision_note TEXT,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_queue_status ON public.sync_queue (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_queue TO authenticated;
GRANT ALL ON public.sync_queue TO service_role;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync_queue" ON public.sync_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sync_queue" ON public.sync_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. SYNC CONFLICTS (divergence local vs parent)
CREATE TABLE public.sync_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  local_snapshot JSONB,
  parent_snapshot JSONB,
  resolution TEXT CHECK (resolution IN ('local','parent','merged','pending')) DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_conflicts TO authenticated;
GRANT ALL ON public.sync_conflicts TO service_role;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync_conflicts" ON public.sync_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sync_conflicts" ON public.sync_conflicts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. SYNC HEALTH (rolling per-resource health metrics)
CREATE TABLE public.sync_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL UNIQUE,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  avg_latency_ms INT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','degraded','down','unknown')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_health TO authenticated;
GRANT ALL ON public.sync_health TO service_role;
ALTER TABLE public.sync_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync_health" ON public.sync_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sync_health" ON public.sync_health FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER trg_sync_settings_updated BEFORE UPDATE ON public.sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sync_queue_updated BEFORE UPDATE ON public.sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sync_conflicts_updated BEFORE UPDATE ON public.sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sync_health_updated BEFORE UPDATE ON public.sync_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default resource types
INSERT INTO public.sync_settings (resource_type, enabled, auto_accept, direction) VALUES
  ('posts',          true,  false, 'two-way'),
  ('pages',          true,  false, 'two-way'),
  ('templates',      true,  true,  'pull'),
  ('sections',       true,  true,  'pull'),
  ('widgets',        true,  true,  'pull'),
  ('seo',            true,  false, 'two-way'),
  ('geo',            true,  false, 'two-way'),
  ('aeo',            true,  false, 'two-way'),
  ('schema',         true,  false, 'pull'),
  ('menus',          true,  true,  'pull'),
  ('media',          true,  true,  'pull'),
  ('custom_fields',  true,  false, 'pull'),
  ('design_system',  true,  false, 'pull'),
  ('analytics',      true,  true,  'push')
ON CONFLICT (resource_type) DO NOTHING;
