
CREATE TABLE IF NOT EXISTS public.form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  submit_action text NOT NULL DEFAULT 'lead',
  redirect_url text,
  email_to text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.form_definitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_definitions TO authenticated;
GRANT ALL ON public.form_definitions TO service_role;

ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_definitions public read"
  ON public.form_definitions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "form_definitions auth write"
  ON public.form_definitions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "form_definitions auth update"
  ON public.form_definitions FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "form_definitions auth delete"
  ON public.form_definitions FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER form_definitions_updated_at
  BEFORE UPDATE ON public.form_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
