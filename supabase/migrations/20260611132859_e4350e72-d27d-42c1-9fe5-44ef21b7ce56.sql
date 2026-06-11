
-- custom_post_types
CREATE TABLE public.custom_post_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  icon TEXT DEFAULT 'Layers',
  supports JSONB NOT NULL DEFAULT '["title","body","excerpt","featured","slug"]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  has_archive BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_post_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_post_types TO authenticated;
GRANT ALL ON public.custom_post_types TO service_role;
ALTER TABLE public.custom_post_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read CPTs" ON public.custom_post_types FOR SELECT USING (true);
CREATE POLICY "Auth manage CPTs" ON public.custom_post_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cpt_updated_at BEFORE UPDATE ON public.custom_post_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- custom_fields
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpt_slug TEXT NOT NULL REFERENCES public.custom_post_types(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cpt_slug, field_key)
);
CREATE INDEX custom_fields_cpt_idx ON public.custom_fields(cpt_slug, position);
GRANT SELECT ON public.custom_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_fields TO authenticated;
GRANT ALL ON public.custom_fields TO service_role;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fields" ON public.custom_fields FOR SELECT USING (true);
CREATE POLICY "Auth manage fields" ON public.custom_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fields_updated_at BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cpt_entries
CREATE TABLE public.cpt_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpt_slug TEXT NOT NULL REFERENCES public.custom_post_types(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  author_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cpt_slug, slug)
);
CREATE INDEX cpt_entries_cpt_idx ON public.cpt_entries(cpt_slug, status);
GRANT SELECT ON public.cpt_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cpt_entries TO authenticated;
GRANT ALL ON public.cpt_entries TO service_role;
ALTER TABLE public.cpt_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published entries" ON public.cpt_entries FOR SELECT USING (status = 'published');
CREATE POLICY "Auth read all entries" ON public.cpt_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert entries" ON public.cpt_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update entries" ON public.cpt_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete entries" ON public.cpt_entries FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_cpt_entries_updated_at BEFORE UPDATE ON public.cpt_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- revisions (generic — entity_type + entity_id)
CREATE TABLE public.revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  author_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX revisions_entity_idx ON public.revisions(entity_type, entity_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revisions TO authenticated;
GRANT ALL ON public.revisions TO service_role;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage revisions" ON public.revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: auto-snapshot a revision on cpt_entries UPDATE (before change)
CREATE OR REPLACE FUNCTION public.snapshot_cpt_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.revisions (entity_type, entity_id, snapshot, author_id, note)
    VALUES (
      'cpt_entry',
      OLD.id::text,
      jsonb_build_object(
        'title', OLD.title,
        'slug', OLD.slug,
        'status', OLD.status,
        'data', OLD.data,
        'cpt_slug', OLD.cpt_slug,
        'updated_at', OLD.updated_at
      ),
      OLD.author_id,
      'auto'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cpt_entries_snapshot
  BEFORE UPDATE ON public.cpt_entries
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_cpt_revision();
